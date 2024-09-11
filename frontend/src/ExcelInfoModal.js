// ExcelInfoModal.js
import React from 'react';
import './ExcelInfoModal.css';
import example from './Images/example.png';

const ExcelInfoModal = ({ isOpen, onClose, onContinue }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Excel File Instructions</h2>
        <p>
          Please upload an Excel file with the following columns:
          <ul>
            <li>email: The recipient's email address</li>
            <li>attachment_path: The file path of the attachment to be sent</li>
          </ul>
        </p>
        <div className="image-container">
          <h3>Sample Excel Image</h3>
          <img src={example} alt="Excel file example" />
        </div>
        <div className="modal-buttons">
          <button onClick={onClose}>Close</button>
          <button onClick={onContinue}>Continue</button>
        </div>
      </div>
    </div>
  );
};

export default ExcelInfoModal;