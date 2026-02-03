const API_BASE = 'symposium-8kzf0vtfb-thanush2412s-projects.vercel.app';

function getEventId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function showLoading(elementId = 'content') {
    document.getElementById(elementId).innerHTML = '<div style="text-align:center; padding: 50px; color: white;">Loading event details...</div>';
}

function showError(message, elementId = 'content') {
    document.getElementById(elementId).innerHTML = `<div style="text-align:center; padding: 50px; color: #ff6b6b;">Error: ${message}</div>`;
}

// ─── DESCRIPTION PAGE LOGIC ────────────────────────────────────────────────
async function loadEventDetails() {
    const eventId = getEventId();
    if (!eventId) {
        showError("No event selected.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`);
        if (!response.ok) throw new Error('Event not found');
        const event = await response.json();

        // Populate DOM
        document.title = event.title;
        document.getElementById('eventLogo').style.backgroundImage = `url('${event.image}')`;
        document.getElementById('eventTitle').textContent = event.title;
        document.getElementById('eventTagline').textContent = event.tagline || '';
        document.getElementById('eventVenue').textContent = `Venue : ${event.venue}`;
        document.getElementById('eventTime').textContent = `Duration : ${event.time}`;
        document.getElementById('eventDesc').textContent = event.description;

        // Rules
        const rulesList = document.getElementById('eventRules');
        rulesList.innerHTML = '';
        event.rules.forEach(rule => {
            const li = document.createElement('li');
            li.textContent = rule;
            rulesList.appendChild(li);
        });

        // Topics (if any)
        const topicscontainer = document.getElementById('eventTopicsContainer');
        const topicsList = document.getElementById('eventTopics');
        if (event.topics && event.topics.length > 0) {
            topicscontainer.style.display = 'block';
            topicsList.innerHTML = '';
            event.topics.forEach(topic => {
                const li = document.createElement('li');
                li.textContent = topic;
                topicsList.appendChild(li);
            });
        } else {
            topicscontainer.style.display = 'none';
        }

        // Register Button Link
        const regBtn = document.getElementById("registerBtn");
        regBtn.onclick = function () {
            this.classList.replace("btn-primary", "btn-success");
            this.textContent = "Connecting ✔";
            this.disabled = true;
            setTimeout(() => {
                // Link to the dynamic registration page instead of static file
                window.location.href = `../Registration/event-registration.html?id=${eventId}`;
            }, 500);
        };

    } catch (error) {
        console.error(error);
        showError("Failed to load event data. Please ensure the backend is running.");
    }
}

// ─── REGISTRATION PAGE LOGIC ───────────────────────────────────────────────
let existingEmails = [];
let eventData = null;

async function loadRegistrationPage() {
    const eventId = getEventId();
    if (!eventId) {
        showError("No event selected.");
        return;
    }

    try {
        // Fetch event data
        const eventRes = await fetch(`${API_BASE}/events/${eventId}`);
        if (!eventRes.ok) throw new Error('Event not found');
        eventData = await eventRes.json();

        // Update UI
        document.title = `${eventData.title} - Registration`;
        document.getElementById('eventTitle').textContent = eventData.title;
        document.body.style.setProperty('--event-bg', `url('${eventData.image}')`);

        // Generate Participant Fields based on team size
        generateParticipantFields(eventData.teamSize);

        // Fetch existing registrations for duplicate check
        const regRes = await fetch(`${API_BASE}/registrations`);
        if (regRes.ok) {
            const registrations = await regRes.json();
            registrations.forEach(r => {
                if (r.participantsEmail) existingEmails.push(...r.participantsEmail);
                else if (r.email) existingEmails.push(r.email);
            });
        }

    } catch (error) {
        console.error(error);
        showError("Failed to load registration. Please try again.");
    }
}

function generateParticipantFields(teamSize) {
    const container = document.getElementById('participantsContainer');
    container.innerHTML = '';

    // Names
    const nameLabel = document.createElement('label');
    nameLabel.textContent = "Participant Names:";
    container.appendChild(nameLabel);

    const nameRow = document.createElement('div');
    nameRow.className = 'name-row';
    for (let i = 1; i <= teamSize; i++) {
        const div = document.createElement('div');
        div.style.width = "100%";
        div.innerHTML = `
            <input type="text" placeholder="Participant ${i}" id="Participant-${i}" required>
            <div class="error-message" id="error-Participant-${i}"></div>
        `;
        nameRow.appendChild(div);
    }
    container.appendChild(nameRow);

    // Emails
    const emailLabel = document.createElement('label');
    emailLabel.textContent = "Participant Emails:";
    emailLabel.style.marginTop = "20px";
    container.appendChild(emailLabel);

    const emailRow = document.createElement('div');
    emailRow.className = 'name-row';
    for (let i = 1; i <= teamSize; i++) {
        const div = document.createElement('div');
        div.style.width = "100%";
        div.innerHTML = `
            <input type="email" placeholder="Email ${i}" id="email-${i}" required>
            <div class="error-message" id="error-email-${i}"></div>
        `;
        emailRow.appendChild(div);
    }
    container.appendChild(emailRow);
}

// Validation & Submission
async function validateAndSubmit() {
    clearAllErrors();
    let isValid = true;
    const teamSize = eventData.teamSize;

    // Names & Emails
    const enteredEmails = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = 1; i <= teamSize; i++) {
        // Name
        const nameId = `Participant-${i}`;
        const nameVal = document.getElementById(nameId).value.trim();
        if (!nameVal) {
            showErrorUI(nameId, 'Name is required');
            isValid = false;
        }

        // Email
        const emailId = `email-${i}`;
        const emailVal = document.getElementById(emailId).value.trim().toLowerCase();

        if (!emailVal) {
            showErrorUI(emailId, 'Email is required');
            isValid = false;
        } else if (!emailRegex.test(emailVal)) {
            showErrorUI(emailId, 'Invalid email format');
            isValid = false;
        } else if (enteredEmails.includes(emailVal)) {
            showErrorUI(emailId, 'Duplicate email in this team');
            isValid = false;
        } else if (existingEmails.includes(emailVal)) {
            showErrorUI(emailId, 'Already registered');
            isValid = false;
        } else {
            enteredEmails.push(emailVal);
        }
    }

    // Common Fields
    ['mobile', 'college', 'course', 'city'].forEach(id => {
        if (!document.getElementById(id).value.trim()) {
            showErrorUI(id, 'This field is required');
            isValid = false;
        }
    });

    // Mobile
    const mobile = document.getElementById('mobile').value.trim();
    if (mobile && !/^[0-9]{10}$/.test(mobile)) {
        showErrorUI('mobile', 'Enter valid 10-digit mobile');
        isValid = false;
    }

    if (isValid) {
        await submitRegistration(enteredEmails);
    }
}

function showErrorUI(fieldId, msg) {
    const err = document.getElementById(`error-${fieldId}`);
    const inp = document.getElementById(fieldId);
    if (err) { err.textContent = msg; err.style.display = 'block'; }
    if (inp) inp.classList.add('input-error');
}

function clearAllErrors() {
    document.querySelectorAll('.error-message').forEach(e => e.style.display = 'none');
    document.querySelectorAll('.input-error').forEach(e => e.classList.remove('input-error'));
}

async function submitRegistration(emails) {
    const btn = document.getElementById("registerBtn");
    btn.disabled = true;
    btn.textContent = "Submitting...";

    try {
        const participantsName = [];
        for (let i = 1; i <= eventData.teamSize; i++) {
            participantsName.push(document.getElementById(`Participant-${i}`).value.trim());
        }

        const formData = {
            eventName: eventData.title,
            participantsName,
            participantsEmail: emails,
            mobile: document.getElementById('mobile').value.trim(),
            college: document.getElementById('college').value.trim(),
            course: document.getElementById('course').value,
            city: document.getElementById('city').value,
            veg: '0', // Default
            nonveg: '0'
        };

        const response = await fetch(`${API_BASE}/createregistration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            btn.classList.replace("btn-primary", "btn-success");
            btn.textContent = "Submitted ✔";
            // Redirect to generic confirmation or specific one
            // Ideally should be a dynamic confirmation page too
            setTimeout(() => {
                window.location.href = `../Confirmation/${eventData.eventId}confirmation.html`; // fallback to old confirmation or make dynamic
            }, 1000);
        } else {
            throw new Error(result.message || 'Registration failed');
        }
    } catch (error) {
        alert(error.message);
        btn.disabled = false;
        btn.textContent = "Submit";
    }
}
