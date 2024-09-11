import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ListedJobs.css';
import { FaSortUp, FaSortDown } from 'react-icons/fa';
import { API_BASE_URL } from './config';

const ListedJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sortField, setSortField] = useState('listed-date');
    const [sortDirection, setSortDirection] = useState('desc');

    const fetchJobs = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(`${API_BASE_URL}/mail-queue`, {
                headers: {
                    'Authorization': localStorage.getItem('token')
                }
            });
            setJobs(response.data);
        } catch (error) {
            setError('Error fetching jobs: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const stripHtmlTags = (html) => {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleString();
    };

    const handleSort = (field) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const sortJobs = (jobList) => {
        return [...jobList].sort((a, b) => {
            if (a[sortField] < b[sortField]) return sortDirection === 'asc' ? -1 : 1;
            if (a[sortField] > b[sortField]) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const renderSortIcon = (field) => {
        if (sortField === field) {
            return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
        }
        return null;
    };

    const renderJobTable = (jobList, status) => {
        const sortedJobs = sortJobs(jobList);
        let lastListedDate = null;

        return (
            <div className={`job-table ${status}`}>
                <h3>{status.charAt(0).toUpperCase() + status.slice(1)} Jobs</h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('listed-date')}>
                                    Listed Date {renderSortIcon('listed-date')}
                                </th>
                                <th onClick={() => handleSort('processed-date')}>
                                    Processed Date {renderSortIcon('processed-date')}
                                </th>
                                <th>Mail Queue ID</th>
                                <th>To</th>
                                <th>Subject</th>
                                <th>Text</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedJobs.map((job, index) => {
                                const mailContext = typeof job['mail-context'] === 'string' 
                                    ? JSON.parse(job['mail-context']) 
                                    : job['mail-context'];
                                const plainText = stripHtmlTags(mailContext.text || '');
                                const currentListedDate = job['listed-date'] ? job['listed-date'].split('T')[0] : null;
                                const isSameListedDate = currentListedDate && currentListedDate === lastListedDate;
                                lastListedDate = currentListedDate;

                                return (
                                    <tr key={job['mail-queue-id']} className={isSameListedDate ? 'same-listed-date' : ''}>
                                        <td>{formatDateTime(job['listed-date'])}</td>
                                        <td>{formatDateTime(job['processed-date'])}</td>
                                        <td>{job['mail-queue-id']}</td>
                                        <td>{mailContext.to || 'N/A'}</td>
                                        <td>{mailContext.subject || 'N/A'}</td>
                                        <td>{plainText.length > 50 ? `${plainText.substring(0, 50)}...` : plainText}</td>
                                        <td>{job['mail-status']}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const pendingJobs = jobs.filter(job => job['mail-status'] === 'pending');
    const sentJobs = jobs.filter(job => job['mail-status'] === 'sent');
    const failedJobs = jobs.filter(job => job['mail-status'] === 'failed');

    return (
        <div className="listed-jobs-container">
            <h2>Listed Jobs</h2>
            <button onClick={fetchJobs} disabled={loading}>Refresh</button>
            {loading && <p>Loading...</p>}
            {error && <p className="error-message">{error}</p>}
            {renderJobTable(pendingJobs, 'pending')}
            {renderJobTable(sentJobs, 'sent')}
            {renderJobTable(failedJobs, 'failed')}
        </div>
    );
};

export default ListedJobs;