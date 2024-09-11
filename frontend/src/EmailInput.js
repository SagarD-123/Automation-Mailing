import React, { useState, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';

const EmailInput = ({ emails, setEmails, placeholder }) => {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addEmail();
        }
    };

    const addEmail = () => {
        const trimmedEmail = inputValue.trim();
        if (trimmedEmail && !emails.includes(trimmedEmail)) {
            setEmails([...emails, trimmedEmail]);
            setInputValue('');
        }
    };

    const removeEmail = (emailToRemove) => {
        setEmails(emails.filter(email => email !== emailToRemove));
    };

    return (
        <div className="email-input-container" onClick={() => inputRef.current.focus()}>
            {emails.map((email, index) => (
                <div key={index} className="email-chip">
                    {email}
                    <button onClick={() => removeEmail(email)} className="remove-email">
                        <FaTimes />
                    </button>
                </div>
            ))}
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onBlur={addEmail}
                placeholder={emails.length === 0 ? placeholder : ''}
            />
        </div>
    );
};

export default EmailInput;