import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill';

import 'react-quill/dist/quill.snow.css'; 
import './Email.css';
import { FaPaperPlane, FaPaperclip, FaEnvelope, FaCopy, FaFont, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { API_BASE_URL } from './config';

const Email = () => {
    const [to, setTo] = useState('');
    const [cc, setCc] = useState('');
    const [subject, setSubject] = useState('');
    const [text, setText] = useState('');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [isMultiple, setIsMultiple] = useState(true);
    const [trainingGroups, setTrainingGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [emailPassword, setEmailPassword] = useState('');
    const [userID, setUserID] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [sendIndividualAttachments, setSendIndividualAttachments] = useState(false);
    const [recipients, setRecipients] = useState([]); 
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [searchTerm, setSearchTerm] = useState('');


    const isValidEmail = (email) => {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };

    const handleFileChange = (e) => {
        setAttachments([...e.target.files]);
    };

    useEffect(() => {
        const storedUserID = localStorage.getItem('userID');
        setUserID(storedUserID);

        axios.get(`${API_BASE_URL}/templates`)
            .then(response => setTemplates(response.data))
            .catch(error => console.error('Error fetching templates:', error));

        axios.get(`${API_BASE_URL}/training-details`)
            .then(response => setTrainingGroups(response.data))
            .catch(error => console.error('Error fetching training groups:', error));
    }, []);

    useEffect(() => {
        if (selectedTemplate) {
            axios.get(`${API_BASE_URL}/templates/${selectedTemplate}`)
                .then(response => {
                    setText(response.data.content);
                    setSubject(response.data.subject);
                })
                .catch(error => console.error('Error fetching template:', error));
        }
    }, [selectedTemplate]);

    useEffect(() => {
        if (selectedGroup) {
            axios.get(`${API_BASE_URL}/batches/${selectedGroup}`)
                .then(response => setBatches(response.data))
                .catch(error => console.error('Error fetching batches:', error));
        }
    }, [selectedGroup]);

    useEffect(() => {
        if (selectedGroup && selectedBatch) {
            axios.get(`${API_BASE_URL}/students/${selectedGroup}/${selectedBatch}`)
                .then(response => {
                    setRecipients(response.data);
                    const emails = response.data.map(student => student.email).join(',');
                    setTo(emails);
                })
                .catch(error => {
                    console.error('Error fetching students:', error);
                   
                    setRecipients([]);
                    setTo('');
                });
        }
    }, [selectedGroup, selectedBatch]);//(2)

    const sortedRecipients = useMemo(() => {
        let sortableItems = [...recipients];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [recipients, sortConfig]);

    const filteredRecipients = useMemo(() => {
        return sortedRecipients.filter(student =>
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.PRN.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sortedRecipients, searchTerm]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (columnName) => {
        if (sortConfig.key === columnName) {
            return sortConfig.direction === 'ascending' ? <FaSortUp /> : <FaSortDown />;
        }
        return <FaSort />;
    };

    const handleSendEmail = async () => {
        if (!showPasswordInput) {
            setShowPasswordInput(true);
            return;
        }
        // THIS IS ONE
        if (!emailPassword.trim()) {
            setPasswordError('Please enter your email password');
            return;
        }

        setPasswordError('');

        let recipients = to;

        if (!isMultiple && !isValidEmail(to)) {
            alert('Please enter a valid email address');
            return;
        }

        if (isMultiple && selectedGroup && selectedBatch) {
            try {
                const response = await axios.get(`${API_BASE_URL}/students/${selectedGroup}/${selectedBatch}`);
                recipients = response.data.join(',');
            } catch (error) {
                alert('Error fetching student emails. Please try again.');
                return;
            }
        }

        const formData = new FormData();
        formData.append('to', recipients);
        formData.append('cc', cc);
        formData.append('subject', subject);
        formData.append('text', text);
        formData.append('isMultiple', isMultiple);
        formData.append('selectedGroup', selectedGroup);
        formData.append('selectedBatch', selectedBatch);
        formData.append('emailPassword', emailPassword);
        formData.append('templateId', selectedTemplate);
        formData.append('sendIndividualAttachments', sendIndividualAttachments);
        attachments.forEach((file) => {
            formData.append('attachments', file);
        });


        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_BASE_URL}/send-email`, formData, {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert('Email Queued successfully, Check in Logs for Confirmation');
            setShowPasswordInput(false);
            setEmailPassword('');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                setPasswordError('Incorrect password. Please try again.');
            } else {
                alert('Error sending email. Please try again.');
            }
        }
    };

    return (
        <div className="email-compose-container">
            <div className="email-header">
                <h2><FaEnvelope /> Compose Email</h2>
            </div>
            <div className="email-body">

                {/* <div className="form-group">
                    <label><FaUserFriends /> Recipient Type:</label>
                    <div className="custom-select">
                        <select value={isMultiple ? 'Multiple' : 'Single'} onChange={e => setIsMultiple(e.target.value === 'Multiple')}>
                            <option value="Single">Single</option>
                            <option value="Multiple">Multiple</option>
                        </select>
                    </div>
                </div> */}
                {isMultiple ? (
                    <>
                        <div className="form-group">
                            <label>Training Group:</label>
                            <div className="custom-select">
                                <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
                                    <option value="">Select a group</option>
                                    {trainingGroups.map(group => (
                                        <option key={group['training-id']} value={group['training-id']}>
                                            {group['training-name']}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Batch:</label>
                            <div className="custom-select">
                                <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                                    <option value="">Select a batch</option>
                                    {batches.map(batch => (
                                        <option key={batch['batch-id']} value={batch['batch-id']}>
                                            {batch['batch-name']}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="form-group">
                        <label><FaEnvelope /> To:</label>
                        <input
                            type="email"
                            placeholder="Recipient's email"
                            value={to}
                            onChange={e => setTo(e.target.value)}
                        />
                    </div>
                )}

                {isMultiple && selectedGroup && selectedBatch && recipients.length > 0 && (
                    <div className="recipients-table-container">
                        <div className="recipients-table-header">
                            <label>Recipients:</label>
                            <input
                                type="text"
                                placeholder="Search recipients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <div className="recipients-table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th onClick={() => requestSort('PRN')}>
                                            PRN {getSortIcon('PRN')}
                                        </th>
                                        <th onClick={() => requestSort('name')}>
                                            Name {getSortIcon('name')}
                                        </th>
                                        <th>Email</th>
                                        <th>Training</th>
                                        <th>Batch</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecipients.map((student, index) => (
                                        <tr key={index}>
                                            <td>{student.PRN}</td>
                                            <td>{student.name}</td>
                                            <td>{student.email}</td>
                                            <td>{student['training-name']}</td>
                                            <td>{student['batch-name']}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                <div className="form-group">
                    <label><FaCopy /> CC:</label>
                    <input
                        type="email"
                        placeholder="CC recipients"
                        value={cc}
                        onChange={e => setCc(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label><FaFont /> Template:</label>
                    <div className="custom-select">
                        <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                            <option value="">Select a template</option>
                            {templates.map(template => (
                                <option key={template['temp-id']} value={template['temp-id']}>
                                    {template['temp-purpose']}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label><FaFont /> Subject:</label>
                    <input
                        type="text"
                        placeholder="Email subject"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                    />
                </div>
                <div className="form-group message-box">
                    <label>Message:</label>
                    <ReactQuill
                        value={text}
                        onChange={setText}
                        placeholder="Compose your message"
                    />
                </div>
                <div className="form-group">
                    <label className="custom-checkbox"><FaPaperclip />Send Individual Attachments (e.g., Certificates,Feedback)
                        <input
                            type="checkbox"
                            checked={sendIndividualAttachments}
                            onChange={(e) => setSendIndividualAttachments(e.target.checked)}
                        />
                        <span className="checkmark"></span>

                    </label>
                </div>
                <div className="form-group">
                    <label><FaPaperclip /> Additional Attachments If:</label>
                    <div className="file-input">
                        <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="file-input-label">
                            Alert:This attachment is for Every Recipient.
                        </label>
                    </div>
                </div>
                {showPasswordInput && (
                    <div className="form-group">
                        <input
                            type="password"
                            placeholder="Email Password"
                            value={emailPassword}
                            onChange={e => setEmailPassword(e.target.value)}
                        />
                        {passwordError && <p className="error-message">{passwordError}</p>}
                    </div>
                )}
                <button onClick={handleSendEmail} className="send-button">
                    <FaPaperPlane /> Send Email
                </button>
            </div>
        </div>
    );
};

export default Email;
