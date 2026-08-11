import emailjs from '@emailjs/browser';
import * as dotenv from 'dotenv';
dotenv.config();

// We need to mock the environment for emailjs if running outside browser, 
// but wait, @emailjs/browser requires XMLHttpRequest or fetch. 
// In Node 18+ fetch is global.
// Actually, EmailJS has @emailjs/nodejs for server-side.
// Let's just use raw fetch to hit the EmailJS REST API directly to test the credentials.

const data = {
    service_id: process.env.VITE_EMAILJS_SERVICE_ID,
    template_id: process.env.VITE_EMAILJS_TEMPLATE_RESOLVED,
    user_id: process.env.VITE_EMAILJS_PUBLIC_KEY,
    template_params: {
        ticket_id: 'TEST1234',
        customer_email: 'atsoca.tech@gmail.com',
        department_email: 'atsoca.tech@gmail.com',
        department: 'Operations',
        resolution_notes: 'This is a test from the script.'
    }
};

fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
})
.then(res => {
    if (res.ok) {
        console.log("EmailJS Success!");
    } else {
        return res.text().then(text => console.error("EmailJS Error:", text));
    }
})
.catch(err => console.error("Network Error:", err));
