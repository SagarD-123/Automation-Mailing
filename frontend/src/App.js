
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, Outlet } from 'react-router-dom';
import Auth from './Auth';
import Home from './Home';
import Email from './Email';
import ExcelUploadAndQueue from './ExcelUploadAndQueue';
import ListedJobs from './ListedJobs';
import SingleEmail from './SingleEmail';
import PrivateRoute from './PrivateRoute';
import './App.css';
import cdac from './Images/cdac.png';
import profile from './Images/profile.png';
import { FiMail,  FiLogOut, FiMenu, FiHome, FiUpload, FiList } from 'react-icons/fi';
import { API_BASE_URL } from './config';

const Layout = ({ isLoggedIn, setIsLoggedIn }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);


    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userID');
        setIsLoggedIn(false);
        window.location.href = '/';
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };


    return (
        <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isDarkMode ? 'dark-mode' : ''}`}>
            <aside className="sidebar">
                <button className="sidebar-toggle" onClick={toggleSidebar}>
                    <FiMenu />
                    {isSidebarOpen && <span>Menu</span>}
                </button>
                <nav className="navbar">
                    <ul>
                        <li><NavLink to="/home" activeclassname="active"><FiHome /><span>Home</span></NavLink></li>
                        <li><NavLink to="/single-email" activeclassname="active"><FiMail /><span>Single Email</span></NavLink></li>
                        <li><NavLink to="/email" activeclassname="active"><FiMail /><span>Send Email To CDAC Students</span></NavLink></li>
                        <li><NavLink to="/excel-upload" activeclassname="active"><FiUpload /><span>Send Email Through Excel Sheet</span></NavLink></li>
                        <li><NavLink to="/listed-jobs" activeclassname="active"><FiList /><span>Listed Jobs</span></NavLink></li>
                       

                    </ul>
                </nav>
                <div className='profile'>
                    <img src={profile} alt='Profile' />
                    <p>{localStorage.getItem('userID')}</p>
                    <button onClick={handleLogout} className="logout-btn"><FiLogOut /><span>Logout</span></button>
                </div>
            </aside>
            <main className="content">
                <header className="content-header">
                    <div className="header-actions">
                        <button className="mobile-menu-toggle" onClick={toggleSidebar}>
                            <FiMenu />
                        </button>
                    </div>
                    <NavLink to="/home" > <img src={cdac} alt='CDAC Logo' className="header-logo" /></NavLink>
                </header>
                <div className="main-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
           
            fetch(`${API_BASE_URL}/verifyToken`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token,
                },
            })
                .then(response => response.json())
                .then(data => {
                    if (data.valid) {
                        setIsLoggedIn(true);
                    } else {
                        localStorage.removeItem('token');
                        localStorage.removeItem('userID');
                        setIsLoggedIn(false);
                    }
                })
                .catch(error => {
                    console.error('Error verifying token:', error);
                    setIsLoggedIn(false);
                });
        }
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Auth setIsLoggedIn={setIsLoggedIn} />} />
                <Route
                    element={
                        <PrivateRoute isLoggedIn={isLoggedIn}>
                            <Layout isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
                        </PrivateRoute>
                    }
                >
                    <Route path="/home" element={<Home />} />
                    <Route path="/email" element={<Email />} />
                    <Route path="/excel-upload" element={<ExcelUploadAndQueue />} />
                    <Route path="/listed-jobs" element={<ListedJobs />} />
                    <Route path="/single-email" element={<SingleEmail />} />
                    
                    
                </Route>
            </Routes>
        </Router>
    );
};

export default App;