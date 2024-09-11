import React, { useState } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './SingleEmail.css';
import { FaPaperPlane, FaPaperclip, FaEnvelope, FaCopy, FaFont } from 'react-icons/fa';
import EmailInput from './EmailInput';
import { API_BASE_URL } from './config';

const SingleEmail = () => {
    const [to, setTo] = useState([]);
    const [cc, setCc] = useState([]);
    const [bcc, setBcc] = useState([]);
    const [subject, setSubject] = useState('');
    const [text, setText] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [emailPassword, setEmailPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const handleFileChange = (e) => {
        setAttachments([...e.target.files]);
    };

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSendEmail = async () => {
        if (!showPasswordInput) {
            setShowPasswordInput(true);
            return;
        }

        if (!emailPassword.trim()) {
            setPasswordError('Please enter your email password');
            return;
        }

        setPasswordError('');

        if (to.length === 0 || !to.every(isValidEmail)) {
            alert('Please enter valid email address(es) in the To field');
            return;
        }

        if (cc.length > 0 && !cc.every(isValidEmail)) {
            alert('Please enter valid email address(es) in the CC field');
            return;
        }

        if (bcc.length > 0 && !bcc.every(isValidEmail)) {
            alert('Please enter valid email address(es) in the BCC field');
            return;
        }

        const formData = new FormData();
        formData.append('to', to.join(','));
        formData.append('cc', cc.join(','));
        formData.append('bcc', bcc.join(','));
        formData.append('subject', subject);
        formData.append('text', text);
        formData.append('emailPassword', emailPassword);
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
            alert('Email Queued successfully. Check Logs for Confirmation');
            setShowPasswordInput(false);
            setEmailPassword('');

            setTo([]);
            setCc([]);
            setBcc([]);
            setSubject('');
            setText('');
            setAttachments([]);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                setPasswordError('Incorrect password. Please try again.');
            } else {
                alert('Error sending email. Please try again.');
            }
        }
    };

    return (
        <div className="single-email-compose-container">
            <div className="email-header">
                <h2><FaEnvelope /> Compose Single Email</h2>
            </div>
            <div className="email-body">
                <div className="form-group">
                    <label><FaEnvelope /> To:</label>
                    <EmailInput
                        emails={to}
                        setEmails={setTo}
                        placeholder="Recipient's email(s)"
                    />
                </div>
                <div className="form-group">
                    <label><FaCopy /> CC:</label>
                    <EmailInput
                        emails={cc}
                        setEmails={setCc}
                        placeholder="CC recipients (optional)"
                    />
                </div>
                {/* <div className="form-group">
                    <label><FaEyeSlash /> BCC:</label>
                    <EmailInput
                        emails={bcc}
                        setEmails={setBcc}
                        placeholder="BCC recipients (optional)"
                    />
                </div> */}
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
                    <label><FaPaperclip /> Attachments:</label>
                    <div className="file-input">
                        <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="file-input-label">
                            Choose Files
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

export default SingleEmail;