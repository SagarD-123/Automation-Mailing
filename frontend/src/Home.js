import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiUsers, FiUpload, FiList } from 'react-icons/fi';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
   
      <div className="card-container">
        <Link to="/single-email" className="card">
          <FiMail className="card-icon" />
          <h2>Compose An Email</h2>
          <p>Email to Specific Person</p>
        </Link>
        <Link to="/email" className="card">
          <FiUsers className="card-icon" />
          <h2>To CDAC Students Programwise</h2>
          <p>Bulk Email to Program's Student like PG-DAC,PG-DBDA</p>
        </Link>
        <div className="card" onClick={() => navigate('/excel-upload')}>
          <FiUpload className="card-icon" />
          <h2>Send Bulk Email Through Excel Sheet</h2>
          <p>Tip: Excel Format As Mentioned</p>
        </div>
        <Link to="/listed-jobs" className="card">
          <FiList className="card-icon" />
          <h2>View Listed Jobs</h2>
          <p>Check the status of sent emails</p>
        </Link>
      </div>
      {/* <div className="home-footer">
        <p>© 2024 Email Management System. All rights reserved.</p>
      </div> */}
    </div>
  );
};

export default Home;