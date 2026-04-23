(function () {
    'use strict';

    function apiBase() {
        if (typeof window === 'undefined') return '';
        if (window.location.protocol === 'file:') return 'http://localhost:3000';
        return '';
    }

    async function parseJsonSafe(response) {
        const text = await response.text();
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch {
            return { error: text.slice(0, 200) || 'Unexpected server response.' };
        }
    }

    function openSuccessModal(hotelId) {
        const modal = document.getElementById('register-success-modal');
        const idLine = document.getElementById('register-modal-id');
        if (idLine) {
            idLine.textContent = hotelId ? `Reference ID: ${hotelId}` : '';
            idLine.hidden = !hotelId;
        }
        if (modal) {
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            document.getElementById('register-modal-dismiss')?.focus();
        }
    }

    function closeSuccessModal() {
        const modal = document.getElementById('register-success-modal');
        if (modal) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        }
        document.body.style.overflow = '';
    }

    function setFilesOnInput(fileInput, fileList) {
        const picked = Array.from(fileList).filter((f) => f.type.startsWith('image/')).slice(0, 10);
        if (picked.length === 0) return;
        const dt = new DataTransfer();
        picked.forEach((f) => dt.items.add(f));
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function updateImageCountLabel(countLabel, fileInput) {
        if (!countLabel || !fileInput) return;
        const n = fileInput.files.length;
        countLabel.textContent = n > 0 ? `${n} visual(s) selected` : 'No files selected';
    }

    function toggleManualCoords(manualDiv, statusEl) {
        if (!manualDiv) return;
        manualDiv.hidden = !manualDiv.hidden;
        if (!manualDiv.hidden) {
            if (statusEl) statusEl.textContent = '';
            document.getElementById('latitude')?.focus();
        }
    }

    function useCurrentLocation(manualDiv, statusEl, latInput, lngInput) {
        if (!latInput || !lngInput) return;

        if (!navigator.geolocation) {
            window.alert('Geolocation is not supported by this browser. Please enter coordinates manually.');
            if (manualDiv) manualDiv.hidden = false;
            latInput.focus();
            return;
        }

        if (statusEl) {
            statusEl.textContent = 'Accessing GPS…';
            statusEl.style.color = 'var(--color-primary-container)';
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                latInput.value = String(lat);
                lngInput.value = String(lng);
                if (statusEl) {
                    statusEl.textContent = `Location locked: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    statusEl.style.color = 'var(--color-secondary)';
                }
                if (manualDiv) manualDiv.hidden = true;
            },
            (error) => {
                console.error('GPS error:', error);
                if (statusEl) {
                    statusEl.textContent = 'Could not read GPS. Enter coordinates below.';
                    statusEl.style.color = '#a12622';
                }
                if (manualDiv) manualDiv.hidden = false;
                latInput.focus();
            },
            { enableHighAccuracy: true, maximumAge: 60000, timeout: 20000 }
        );
    }

    function init() {
        const form = document.getElementById('hotelRegistrationForm');
        const fileInput = document.getElementById('hotelImages');
        const uploadZone = document.getElementById('uploadZone');
        const countLabel = document.getElementById('imageCountLabel');
        const gpsBtn = document.getElementById('gpsBtn');
        const manualBtn = document.getElementById('manualCoordsBtn');
        const manualDiv = document.getElementById('manualCoords');
        const statusEl = document.getElementById('locationStatus');
        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');
        const contactInput = document.querySelector('.js-digits-only');

        document.getElementById('register-modal-dismiss')?.addEventListener('click', closeSuccessModal);
        document.getElementById('register-success-modal')?.addEventListener('click', (e) => {
            if (e.target.matches('[data-close-modal]')) closeSuccessModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeSuccessModal();
        });

        if (contactInput) {
            contactInput.addEventListener('input', function () {
                this.value = this.value.replace(/\D/g, '');
            });
        }

        if (fileInput && countLabel) {
            fileInput.addEventListener('change', function () {
                const n = this.files.length;
                if (n > 10) {
                    window.alert('You can only upload a maximum of 10 images.');
                    this.value = '';
                    updateImageCountLabel(countLabel, this);
                    return;
                }
                updateImageCountLabel(countLabel, this);
            });
        }

        if (uploadZone && fileInput) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((ev) => {
                uploadZone.addEventListener(ev, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            uploadZone.addEventListener('dragenter', () => uploadZone.classList.add('is-dragover'));
            uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('is-dragover'));
            uploadZone.addEventListener('dragover', () => uploadZone.classList.add('is-dragover'));
            uploadZone.addEventListener('drop', (e) => {
                uploadZone.classList.remove('is-dragover');
                const files = e.dataTransfer?.files;
                if (files && files.length) setFilesOnInput(fileInput, files);
            });

            uploadZone.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInput.click();
                }
            });
        }

        gpsBtn?.addEventListener('click', () =>
            useCurrentLocation(manualDiv, statusEl, latInput, lngInput)
        );
        manualBtn?.addEventListener('click', () => toggleManualCoords(manualDiv, statusEl));

        if (!form) return;

        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const btn = document.getElementById('submitBtn');
            const msgBox = document.getElementById('responseMessage');
            const lat = (latInput?.value || '').trim();
            const lng = (lngInput?.value || '').trim();

            if (!lat || !lng) {
                window.alert('Please use “Use current location” or “Enter manually” and fill latitude and longitude.');
                if (manualDiv) manualDiv.hidden = false;
                latInput?.focus();
                return;
            }

            const latN = Number(lat);
            const lngN = Number(lng);
            if (Number.isNaN(latN) || Number.isNaN(lngN)) {
                window.alert('Latitude and longitude must be valid numbers.');
                return;
            }

            if (!fileInput?.files?.length) {
                window.alert('Please add at least one image.');
                uploadZone?.focus();
                return;
            }

            if (msgBox) {
                msgBox.style.display = 'none';
                msgBox.className = 'response-message';
                msgBox.innerHTML = '';
            }
            if (btn) {
                btn.disabled = true;
                btn.innerHTML =
                    'SENDING… <span class="material-symbols-outlined" aria-hidden="true">hourglass_empty</span>';
            }

            try {
                const formData = new FormData(this);
                const response = await fetch(`${apiBase()}/api/hotels/register`, {
                    method: 'POST',
                    body: formData
                });

                const res = await parseJsonSafe(response);

                if (response.ok) {
                    if (msgBox) msgBox.style.display = 'none';
                    this.reset();
                    if (statusEl) statusEl.textContent = '';
                    if (manualDiv) manualDiv.hidden = true;
                    if (latInput) latInput.value = '';
                    if (lngInput) lngInput.value = '';
                    updateImageCountLabel(countLabel, fileInput);
                    const hid = res.hotelId ?? res.insertId;
                    openSuccessModal(hid);
                } else {
                    if (msgBox) {
                        msgBox.style.display = 'block';
                        msgBox.className = 'response-message error-msg';
                        msgBox.innerHTML = res.error ? `Error: ${res.error}` : 'Registration failed.';
                    }
                }
            } catch (err) {
                console.error('Connection failed:', err);
                if (msgBox) {
                    msgBox.style.display = 'block';
                    msgBox.className = 'response-message error-msg';
                    msgBox.innerHTML =
                        'Could not reach the server. Run <code>npm start</code> and open <strong>http://localhost:3000/register.html</strong>.';
                }
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML =
                        'SEND APPLICATION <span class="material-symbols-outlined" aria-hidden="true">arrow_right_alt</span>';
                }
                msgBox?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
