import React, { useState, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { FaUpload, FaPaperPlane, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import ExcelInfoModal from './ExcelInfoModal';
import './ExcelUploadAndQueue.css';
import { API_BASE_URL } from './config';

const ExcelUploadAndQueue = () => {
    const [file, setFile] = useState(null);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [queueing, setQueueing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [emailPassword, setEmailPassword] = useState('');
    const [processedData, setProcessedData] = useState([]);
    const [showInfoModal, setShowInfoModal] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [searchTerm, setSearchTerm] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setProcessedData([]);  
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file to upload.');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                const validData = jsonData.filter(row => row.name && row.email && row.attachment_path);

                if (validData.length === 0) {
                    throw new Error('No valid data found in the Excel file.');
                }

                setProcessedData(validData.map((row, index) => ({ ...row, id: index + 1 })));
                setSuccess('File uploaded and processed successfully.');
                setFile(null);
            } catch (error) {
                console.error('Error in handleUpload:', error);
                setError('Error processing Excel file: ' + error.message);
                setFile(null);
            } finally {
                setUploading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleQueueEmails = () => {
        if (processedData.length === 0 || !subject || !message) {
            setError('Please upload a file, enter a subject, and compose a message.');
            return;
        }
        setShowPasswordModal(true);
    };

    const handlePasswordSubmit = async () => {
        if (!emailPassword) {
            setError('Please enter your email password.');
            return;
        }

        setQueueing(true);
        setError('');
        setSuccess('');

        try {
            const response = await axios.post(`${API_BASE_URL}/queue-excel-emails`, {
                excelData: processedData,
                subject,
                message,
                emailPassword
            }, {
                headers: {
                    'Authorization': localStorage.getItem('token')
                }
            });

            setSuccess(response.data.message);
            setSubject('');
            setMessage('');
            setEmailPassword('');
            setShowPasswordModal(false);
            alert("The Email Job is successfuly Queued. Check in Listed job section.");
        } catch (error) {
            console.error('Error in handlePasswordSubmit:', error);
            setError('Error queueing emails: ' + (error.response?.data?.error || error.message));
        } finally {
            setQueueing(false);
        }
    };

    const handleCancel = () => {
        setShowPasswordModal(false);
        setEmailPassword('');
    };

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

    const sortedData = useMemo(() => {
        let sortableItems = [...processedData];
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
    }, [processedData, sortConfig]);

    const filteredData = useMemo(() => {
        return sortedData.filter(row =>
            row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sortedData, searchTerm]);

    return (
        <div className="excel-upload-page">
            <div className="excel-upload-container">
                <ExcelInfoModal
                    isOpen={showInfoModal}
                    onClose={() => setShowInfoModal(false)}
                    onContinue={() => setShowInfoModal(false)}
                />
                <h2>Upload Excel and Queue Emails</h2>
                <div className="form-group">
                    <label>Excel File (with name, email, and attachment_path columns):</label>
                    <input type="file" onChange={handleFileChange} accept=".xlsx, .xls" />
                    <small>Note: Multiple attachment paths can be separated by commas in the attachment_path column.</small>
                </div>
                <div className="button-group">
                    <button onClick={handleUpload} disabled={uploading || !file}>
                        <FaUpload /> Upload File
                    </button>
                </div>
                {error && <p className="error-message">{error}</p>}
                {success && <p className="success-message">{success}</p>}

                {processedData.length > 0 && (
                    <>
                        <div className="excel-data-table">
                            <div className="table-header">
                                <h3>Uploaded Excel Data</h3>
                                <input
                                    type="text"
                                    placeholder="Search by name or email"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th onClick={() => requestSort('id')}>
                                                S.No. {getSortIcon('id')}
                                            </th>
                                            <th onClick={() => requestSort('name')}>
                                                Name {getSortIcon('name')}
                                            </th>
                                            <th onClick={() => requestSort('email')}>
                                                Email {getSortIcon('email')}
                                            </th>
                                            <th>Attachment Path</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.id}</td>
                                                <td>{row.name}</td>
                                                <td>{row.email}</td>
                                                <td>{row.attachment_path}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Subject:</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Enter email subject"
                            />
                        </div>
                        <div className="form-group">
                            <label>Message:</label>
                            <ReactQuill
                                value={message}
                                onChange={setMessage}
                                placeholder="Compose your message"
                            />
                        </div>
                        <div className="button-group">
                            <button onClick={handleQueueEmails} disabled={queueing}>
                                <FaPaperPlane /> Queue Emails
                            </button>
                        </div>
                    </>
                )}

                <div className={`password-modal-overlay ${showPasswordModal ? 'active' : ''}`}>
                    <div className="password-modal">
                        <h3>Enter Email Password</h3>
                        <input
                            type="password"
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            placeholder="Enter your email password"
                        />
                        <div className="button-group">
                            <button onClick={handlePasswordSubmit} disabled={queueing}>
                                Submit
                            </button>
                            <button onClick={handleCancel} className="cancel-btn">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExcelUploadAndQueue;