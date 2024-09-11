// Required Libraries

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const redis = require('redis');
const Bull = require('bull');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const xlsx = require('xlsx');

const app = express();
const port = 5000;
const ip = '192.168.3.106';

// middleware 
app.use(cors({
    origin: 'http://192.168.3.106:3000',
    credentials: true
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));



// DB connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
});

// creating emailqueue object using redis
const emailQueue = new Bull('emailQueue', {
    redis: {
        host: '127.0.0.1',
        port: 6379
    }
});

// looger object to store logs
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.File({ filename: 'email-detailed.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// function startRedisServer() {
//     const redisServer = spawn('./Redis-x64-3.0.504/redis-server.exe');

//     redisServer.stdout.on('data', (data) => {
//         console.log(`Redis Server: ${data}`);
//     });

//     redisServer.stderr.on('data', (data) => {
//         console.error(`Redis Server Error: ${data}`);
//     });

//     redisServer.on('close', (code) => {
//         console.log(`Redis Server exited with code ${code}`);
//     });
// }

// startRedisServer();


app.use((req, res, next) => {
    logger.info(`HTTP ${req.method} ${req.url}`);
    next();
});


function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).send({ auth: false, message: 'No token provided.' });

    jwt.verify(token, 'your_jwt_secret', function (err, decoded) {
        if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });


        req.user = decoded;
        req.empId = decoded.empId;
        next();
    });
}

// endpoint to verify jwt token
app.post('/verifyToken', (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).send('Token is required');

    jwt.verify(token, 'your_jwt_secret', (err, decoded) => {
        if (err) return res.status(403).send('Invalid token');

        res.send({ valid: true });
    });
});

// endpoint for register in auth page
app.post('/register', async (req, res) => {
    const { userID, password, empId } = req.body;

    // Check if the empId is already registered
    const checkEmpIdQuery = 'SELECT * FROM `login-details` WHERE `emp-id` = ?';
    db.query(checkEmpIdQuery, [empId], async (empIdErr, empIdResult) => {
        if (empIdErr) {
            logger.error('Error checking employee ID:', empIdErr);
            return res.status(500).send('Error checking employee information');
        }

        if (empIdResult.length > 0) {
            return res.status(400).json({ message: 'A username is already registered with this Employee ID' });
        }

        // Check if the username is already taken
        const checkUserIDQuery = 'SELECT * FROM `login-details` WHERE userID = ?';
        db.query(checkUserIDQuery, [userID], async (userIDErr, userIDResult) => {
            if (userIDErr) {
                logger.error('Error checking username:', userIDErr);
                return res.status(500).send('Error checking username');
            }

            if (userIDResult.length > 0) {
                return res.status(400).json({ message: 'Username is not available, try a different username' });
            }

            // Proceed with the original emp-info check and registration
            const checkEmpQuery = 'SELECT * FROM `emp-info` WHERE `emp-id` = ?';
            db.query(checkEmpQuery, [empId], async (empErr, empResult) => {
                if (empErr) {
                    logger.error('Error checking employee:', empErr);
                    return res.status(500).send('Error checking employee information');
                }

                if (empResult.length === 0) {
                    return res.status(400).json({ message: 'Invalid Employee ID' });
                }

                const hashedPassword = await bcrypt.hash(password, 10);
                const insertQuery = 'INSERT INTO `login-details` (userID, password, `emp-id`) VALUES (?, ?, ?)';

                db.query(insertQuery, [userID, hashedPassword, empId], (err, result) => {
                    if (err) {
                        logger.error('Error registering user:', err);
                        res.status(500).send('Error registering user');
                    } else {
                        logger.info('User registered successfully:', { userID, empId });
                        res.json({ message: 'Registration successful' });
                    }
                });
            });
        });
    });
});

// enpoint for login in auth page
app.post('/login', (req, res) => {
    const { userID, password } = req.body;

    const query = 'SELECT * FROM `login-details` WHERE userID = ?';
    db.query(query, [userID], async (err, result) => {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(400).send('Invalid username or password');
        }

        const user = result[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send('Invalid username or password');
        }


        const token = jwt.sign({ userID: user.userID, empId: user['emp-id'] }, 'your_jwt_secret', { expiresIn: '1h' });
        res.send({ token });
    });
});



// endpoint to fetch details of student
app.get('/user-details/:PRN', (req, res) => {
    const { PRN } = req.params;

    const query = 'SELECT * FROM `stu-info` WHERE PRN = ?';
    db.query(query, [PRN], (err, result) => {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).send('User not found');
        }

        res.send(result[0]);
    });
});

//endpoint to fetch details of Template 
app.get('/templates', (req, res) => {
    const query = 'SELECT * FROM `mail-template` WHERE `temp-is-valid` = TRUE';

    db.query(query, (err, result) => {
        if (err) throw err;
        res.send(result);
    });
});

//endpoint to fetch details of specific(selected) template
app.get('/templates/:templateId', (req, res) => {
    const { templateId } = req.params;
    const query = 'SELECT * FROM `mail-template` WHERE `temp-id` = ?';

    db.query(query, [templateId], (err, result) => {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).send('Template not found');
        }

        const template = result[0];
        fs.readFile(template['temp-file-path'], 'utf-8', (err, content) => {
            if (err) throw err;
            res.send({ subject: template['temp-subject'], content });
        });
    });
});

//endpoint to fetch trainings
app.get('/training-details', (req, res) => {
    const query = 'SELECT * FROM `training` WHERE `training-is-valid` = TRUE';

    db.query(query, (err, result) => {
        if (err) throw err;
        res.send(result);
    });
});

//endpoint to fetch batch for the selected training
app.get('/batches/:trainingId', (req, res) => {
    const { trainingId } = req.params;
    const query = 'SELECT * FROM `batch` WHERE `training-id` = ? AND `batch-is-valid` = TRUE';

    db.query(query, [trainingId], (err, result) => {
        if (err) throw err;
        res.send(result);
    });
});

//endpoint to fetch details of the students for the selected training and batch.
app.get('/students/:trainingId/:batchId', (req, res) => {
    const { trainingId, batchId } = req.params;
    const query = `
        SELECT si.PRN, si.name, si.email, t.\`training-name\`, b.\`batch-name\`
        FROM \`stu-info\` si
        JOIN training t ON si.\`training-id\` = t.\`training-id\`
        JOIN batch b ON si.\`batch-id\` = b.\`batch-id\`
        WHERE si.\`training-id\` = ? AND si.\`batch-id\` = ? AND si.\`info-is-valid\` = TRUE
    `;

    db.query(query, [trainingId, batchId], (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({ error: 'An error occurred while fetching students' });
        } else {
            res.json(result);
        }
    });
});

//creating local storage allocation for the attachments
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        cb(null, true);
    }
}).fields([
    { name: 'attachments', maxCount: 10 },
    { name: 'attachment', maxCount: 1 }

]);

//endpoint to queue job for bulk mailing using excel sheet feature.
app.post('/queue-excel-emails', verifyToken, async (req, res) => {
    const { excelData, subject, message, emailPassword } = req.body;
    const empId = req.empId;

    console.log('Received request to /queue-excel-emails');

    try {
        const userEmail = await getUserEmail(empId);

        for (const row of excelData) {
            const { email, attachment_path } = row;
            console.log('Processing row:', { email, attachment_path });


            const attachmentPaths = attachment_path.split(',').map(path => path.trim());

            const individualAttachments = attachmentPaths.map(path => ({ path }));

            try {
                await queueEmail(email, '', subject, message, [], emailPassword, userEmail, individualAttachments, null, empId);
                console.log('Email queued successfully for:', email);
            } catch (queueError) {
                console.error('Error queueing email for:', email, queueError);
            }
        }

        res.json({ message: 'Bulk emails queued successfully from Excel data' });

    } catch (error) {
        console.error('Error in /queue-excel-emails:', error);
        res.status(500).json({ error: 'An error occurred while processing your request', details: error.message });
    }
});

//endpoint to fetch the queued job from database.
app.get('/mail-queue', verifyToken, async (req, res) => {
    try {
        const [queueRows] = await db.promise().query(
            'SELECT `mail-queue-id`, `mail-context`, `mail-status`, `listed-date`, `processed-date` FROM `mail-queue` WHERE `emp-id` = ? ORDER BY FIELD(`mail-status`, "pending", "sent", "failed")',
            [req.empId]
        );

        const formattedJobs = queueRows.map(job => ({
            'mail-queue-id': job['mail-queue-id'],
            'mail-context': job['mail-context'],
            'mail-status': job['mail-status'],
            'listed-date': job['listed-date'],
            'processed-date': job['processed-date']
        }));

        res.json(formattedJobs);
    } catch (error) {
        console.error('Error fetching mail queue:', error);
        res.status(500).json({ error: 'An error occurred while fetching the mail queue' });
    }
});


//fetching and attaching individual attachment to their respective recipient.
async function getIndividualAttachments(recipientEmail, templateId) {
    const query = 'SELECT attachment_path FROM `individual-attachments` WHERE recipient_email = ? AND `temp-id` = ?';
    try {
        const [results] = await db.promise().query(query, [recipientEmail, templateId]);
        return results.map(result => ({ path: result.attachment_path }));
    } catch (error) {
        logger.error('Error fetching individual attachments:', {
            error: error.message,
            stack: error.stack,
            recipientEmail,
            templateId
        });
        return [];
    }
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000;

//structure of email and creating the smtp connection
const sendEmail = async (emailData, attempt = 1) => {
    const { to, cc, subject, text, attachments, emailPassword, userEmail, individualAttachments } = emailData;

    logger.info(`Attempting to send email to ${to}. Attempt ${attempt} of ${MAX_RETRY_ATTEMPTS}`);

    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: userEmail,
            pass: emailPassword,
        },
    });


    let mailOptions = {
        from: userEmail,
        to: to,
        cc: cc,
        subject: subject,
        html: text,
        attachments: [
            ...(attachments || []),
            ...(individualAttachments || [])
        ]

    };
    logger.info(`Sending email with attachments:`, {
        commonAttachments: attachments,
        individualAttachments: individualAttachments
    });

    try {
        let info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        logger.error(`Error sending email to ${to}:`, {
            error: error.message,
            stack: error.stack,
            code: error.code,
            command: error.command
        });

        if ((error.code === 'EAUTH' || error.code === 'ESOCKET') && attempt < MAX_RETRY_ATTEMPTS) {
            logger.info(`Retrying email send to ${to}. Attempt ${attempt + 1} of ${MAX_RETRY_ATTEMPTS}`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return sendEmail(emailData, attempt + 1);
        }

        throw error;
    }
};

//processing the queued job 
emailQueue.process(async (job) => {
    const mailQueueId = job.data.mailQueueId;
    logger.info(`Processing email job: ${mailQueueId}`);

    try {
        const emailData = job.data;
        const success = await sendEmail(emailData);

        if (success) {
            await updateMailQueueStatus(mailQueueId, 'sent');
            logger.info(`Email sent successfully. Mail queue status updated to sent: ${mailQueueId}`);
        }
    } catch (error) {
        logger.error(`Failed to send email for job ${mailQueueId}:`, {
            error: error.message,
            stack: error.stack
        });

        await updateMailQueueStatus(mailQueueId, 'failed');
        logger.info(`Mail queue status updated to failed: ${mailQueueId}`);
    }
});

//updating the mail status after processing
async function updateMailQueueStatus(mailQueueId, status) {
    const updateQuery = 'UPDATE `mail-queue` SET `mail-status` = ?, `mail-is-valid` = FALSE WHERE `mail-queue-id` = ?';
    try {
        await db.promise().query(updateQuery, [status, mailQueueId]);
    } catch (err) {
        logger.error(`Error updating mail queue status to ${status}:`, {
            error: err.message,
            stack: err.stack,
            mailQueueId
        });
        throw err;
    }
}

//endpoint to queue mail for bulk mailing for cdac students feature
app.post('/send-email', [verifyToken, upload], async (req, res) => {
    const { to, cc, subject, text, emailPassword, isMultiple, selectedGroup, selectedBatch, templateId, sendIndividualAttachments } = req.body;

    let attachments = [];
    if (req.files) {
        if (Array.isArray(req.files.attachments)) {
            attachments = req.files.attachments;
        } else if (req.files.attachments) {
            attachments = [req.files.attachments];
        } else if (req.files.attachment && Array.isArray(req.files.attachment)) {
            attachments = req.files.attachment;
        } else if (req.files.attachment) {
            attachments = [req.files.attachment];
        }
    }

    try {

        const empId = req.user.empId;

        if (!empId) {
            return res.status(400).json({ error: 'Employee ID not found in the token' });
        }

        const userEmail = await getUserEmail(req.user.empId);
        const recipients = await getRecipients(isMultiple, selectedGroup, selectedBatch, to);

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'No recipients specified' });
        }

        for (const recipient of recipients) {
            let individualAttachments = [];
            if (sendIndividualAttachments === 'true') {
                individualAttachments = await getIndividualAttachments(recipient, templateId);
            }

            await queueEmail(recipient, cc, subject, text, attachments, emailPassword, userEmail, individualAttachments, templateId, empId);
        }

        res.status(200).json({ message: 'Emails queued successfully' });
    } catch (error) {
        logger.error('Error in /send-email:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'An error occurred while processing your request' });
    }
});

//fetching user's email
async function getUserEmail(empId) {
    const query = 'SELECT email FROM `emp-info` WHERE `emp-id` = ?';
    try {
        const [results] = await db.promise().query(query, [empId]);
        if (results.length === 0) {
            throw new Error('User not found');
        }
        return results[0].email;
    } catch (error) {
        logger.error('Error in getUserEmail:', {
            error: error.message,
            stack: error.stack,
            empId
        });
        throw error;
    }
}

//fetching email of recipient for selected training and batch
async function getRecipients(isMultiple, selectedGroup, selectedBatch, to) {
    if (isMultiple === 'true' && selectedGroup && selectedBatch) {
        const query = 'SELECT email FROM `stu-info` WHERE `training-id` = ? AND `batch-id` = ?';
        const [rows] = await db.promise().query(query, [selectedGroup, selectedBatch]);
        return rows.map(row => row.email);
    } else if (to) {
        return [to];
    }
    return [];
}


async function queueEmail(recipient, cc, subject, text, attachments, emailPassword, userEmail, individualAttachments, templateId, empId) {
    const mailQueueId = uuidv4();
    const mailContext = JSON.stringify({
        to: recipient,
        cc,
        subject,
        text,
        attachments: attachments.map(file => ({ filename: file.originalname, path: file.path })),
        emailPassword,
        userEmail,
        individualAttachments,
        templateId
    });

    const insertQuery = 'INSERT INTO `mail-queue`(`mail-queue-id`, `emp-id`, `mail-context`, `mail-sending-count`, `mail-status`, `mail-is-valid`, `listed-date`) VALUES (?, ?, ?, ?, ?, ?, NOW())';
    try {
        const [result] = await db.promise().query(insertQuery, [mailQueueId, empId, mailContext, 0, 'pending', true]);
        console.log('Inserted into mail queue:', { mailQueueId, recipient, empId, result });
        logger.info('Email job queued successfully:', { mailQueueId, recipient });
    } catch (err) {
        console.error('Error inserting into mail queue:', {
            error: err.message,
            stack: err.stack,
            mailQueueId,
            recipient,
            empId
        });
        throw err;
    }
}


//set of instruction which will be executed in the interval.
setInterval(async () => {
    try {
        const selectQuery = 'SELECT * FROM `mail-queue` WHERE `mail-status` = "pending" AND `mail-is-valid` = TRUE';
        const [results] = await db.promise().query(selectQuery);

        for (const job of results) {
            await processMailQueueJob(job);
        }
    } catch (error) {
        logger.error('Error in mail queue processing interval:', {
            error: error.message,
            stack: error.stack
        });
    }
}, 60000);


async function processMailQueueJob(job) {
    const mailQueueId = job['mail-queue-id'];
    let mailContext;

    try {
        mailContext = typeof job['mail-context'] === 'string' ? JSON.parse(job['mail-context']) : job['mail-context'];
    } catch (parseError) {
        logger.error('Error parsing mail context:', {
            error: parseError.message,
            stack: parseError.stack,
            mailQueueId
        });
        await updateMailQueueStatus(mailQueueId, 'failed');
        return;
    }

    try {
        await emailQueue.add({ ...mailContext, mailQueueId }, {
            attempts: 5,
            backoff: 5000
        });
        logger.info('Mail job added to queue:', { mailQueueId });
        await updateMailQueueProcessedDate(mailQueueId);
    } catch (err) {
        logger.error('Error adding mail job to queue:', {
            error: err.message,
            stack: err.stack,
            mailQueueId
        });
        await updateMailQueueStatus(mailQueueId, 'failed');
    }
}

async function updateMailQueueProcessedDate(mailQueueId) {
    const updateQuery = 'UPDATE `mail-queue` SET `processed-date` = NOW() WHERE `mail-queue-id` = ?';
    try {
        await db.promise().query(updateQuery, [mailQueueId]);
        logger.info('Updated processed date for mail queue job:', { mailQueueId });
    } catch (err) {
        logger.error('Error updating processed date for mail queue job:', {
            error: err.message,
            stack: err.stack,
            mailQueueId
        });
    }
}


app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://${ip}:${port}`);
});
