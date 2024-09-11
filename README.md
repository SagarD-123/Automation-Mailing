# Your Web Application Name

Automation Mailing System for Bulk Mailing Using Templates.This application can make sending bulk mail efficient.Redcuing time and no need of overhead in the process.

## Table of Contents
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)

## Features
- Send Bulk Email Using Excel file.
- Send email to CDAC students just by selecting the batches and Training.
- Use Templates instead of Writing the whole content.

## Technologies Used
- Frontend: ReactJs
- Backend: NodeJs
- Database: MySql
- Other tools/libraries: Nodemailer, Redis, Express, VScode.

## Installation
```bash
# Clone the repository
git clone https://actsgitlab.blr1.cdac.in/wbl-202403/wbldumps.git

# Navigate to the project directory
cd AutomationMailing-Sagar

# Install dependencies
npm install

#Setup the Database with the help of attached queries.
follow the `emailQuery.sql`
tip:make the necessary path changes in database.

#Start the Redis Server
follow the redis folder and click on "redis-server" file.

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration


#Start the Backend and Frontend Server
for Backend: node index.js
for Frontend: npm start

