import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Auth.css';
import cdac from './Images/cdac.png';
import { FaUser, FaLock, FaIdCard } from 'react-icons/fa';
import { API_BASE_URL } from './config';

const Auth = ({ setIsLoggedIn }) => {
    const [activeTab, setActiveTab] = useState('login');
    const [userID, setUserID] = useState('');
    const [password, setPassword] = useState('');
    const [empId, setEmpId] = useState('');
    const [emailError, setEmailError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/register`, { userID, password, empId });
            alert(response.data.message);
            if (response.data.message === 'Registration successful') {
                navigate('/home');
            }
        } catch (error) {
            console.error(error);
            if (error.response && error.response.data) {
                alert(error.response.data.message);
            } else {
                alert('Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/login`, { userID, password });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userID', userID);
            setIsLoggedIn(true);
            navigate('/home');
        } catch (error) {
            console.error(error);
            alert('Login failed. Please check your credentials and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <div className='cdac'><img src={cdac} alt='Logo' /></div>
                <div className="auth-tabs">
                    <button className={activeTab === 'login' ? 'active' : ''} onClick={() => setActiveTab('login')}>Login</button>
                    <button className={activeTab === 'register' ? 'active' : ''} onClick={() => setActiveTab('register')}>Register</button>
                </div>
                <div className="auth-content">
                    {activeTab === 'login' && (
                        <>
                            <h2>Welcome Back</h2>
                            <div className="input-group">
                                <FaUser className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="UserID"
                                    value={userID}
                                    onChange={e => setUserID(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <FaLock className="input-icon" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            <button onClick={handleLogin} disabled={loading} className="submit-btn">
                                {loading ? 'Logging in...' : 'Login'}
                            </button>
                        </>
                    )}
                    {activeTab === 'register' && (
                        <>
                            <h2>Create Account</h2>
                            <div className="input-group">
                                <FaUser className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="UserID"
                                    value={userID}
                                    onChange={e => setUserID(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <FaLock className="input-icon" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <FaIdCard className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="Employee ID"
                                    value={empId}
                                    onChange={e => setEmpId(e.target.value)}
                                />
                            </div>
                            {emailError && <p className="error">{emailError}</p>}
                            <button onClick={handleRegister} disabled={loading} className="submit-btn">
                                {loading ? 'Registering...' : 'Register'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;