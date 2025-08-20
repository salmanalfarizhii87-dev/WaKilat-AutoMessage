'use strict';

(function () {
	const dateInput = document.getElementById('dateDisplay');
	const timeSelect = document.getElementById('timeSelect');
	const pointsContainer = document.getElementById('pointsContainer');
	const addPointBtn = document.getElementById('addPointBtn');
	const generateBtn = document.getElementById('generateBtn');
	const resetBtn = document.getElementById('resetBtn');
	const resultText = document.getElementById('resultText');
	const shareBtn = document.getElementById('shareBtn');

	// TODO: Masukkan API Key Anda di sini
	const GEMINI_API_KEY = 'AIzaSyA-GHNjI6SyPH1OJPZfjQKgYrQcbCzyEP0';
	const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

	// Add ripple effect to buttons
	function addRippleEffect(event) {
		const button = event.currentTarget;
		const ripple = document.createElement('span');
		const rect = button.getBoundingClientRect();
		const size = Math.max(rect.width, rect.height);
		const x = event.clientX - rect.left - size / 2;
		const y = event.clientY - rect.top - size / 2;
		
		ripple.style.width = ripple.style.height = size + 'px';
		ripple.style.left = x + 'px';
		ripple.style.top = y + 'px';
		ripple.classList.add('ripple');
		
		button.appendChild(ripple);
		
		setTimeout(() => {
			ripple.remove();
		}, 600);
	}

	// Add ripple effect to all buttons
	document.querySelectorAll('.btn').forEach(btn => {
		btn.addEventListener('click', addRippleEffect);
	});

	function formatDateIndonesian(date) {
		const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
		const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
		const d = days[date.getDay()];
		const day = date.getDate();
		const m = months[date.getMonth()];
		const y = date.getFullYear();
		return `${d}, ${day} ${m} ${y}`;
	}

	function createPointRow(value = '') {
		const row = document.createElement('div');
		row.className = 'point-row entering';
		row.addEventListener('animationend', function handleEnter() {
			row.removeEventListener('animationend', handleEnter);
			row.classList.remove('entering');
		});

		const textarea = document.createElement('textarea');
		textarea.placeholder = 'Tulis poin hasil rapat...';
		textarea.value = value;

		const removeBtn = document.createElement('button');
		removeBtn.type = 'button';
		removeBtn.className = 'btn danger icon';
		removeBtn.title = 'Hapus poin';
		removeBtn.innerHTML = '<i class="fas fa-times"></i>';
		removeBtn.addEventListener('click', function () {
			row.classList.add('removing');
			row.addEventListener('animationend', function handle() {
				row.removeEventListener('animationend', handle);
				if (row.parentElement) {
					pointsContainer.removeChild(row);
					updateAddRemoveState();
				}
			});
		});

		row.appendChild(textarea);
		row.appendChild(removeBtn);
		return row;
	}

	function updateAddRemoveState() {
		const count = pointsContainer.querySelectorAll('.point-row').length;
		// Minimal 1 baris selalu ada
		if (count === 0) {
			pointsContainer.appendChild(createPointRow());
		}
	}

	function getPoints() {
		return Array.from(pointsContainer.querySelectorAll('textarea'))
			.map(function (t) { return t.value.trim(); })
			.filter(function (v) { return v.length > 0; });
	}

	function buildPrompt({ tanggal, waktu, points }) {
		const exampleFormat = [
			'\uD83D\uDCCC *Notulen/Rangkuman Rapat Paguyuban Kelas 8i SMPN 04 Malang*',
			`*Hari/Tanggal* : ${tanggal}`,
			`*Waktu* : ${waktu}`,
			'',
			'*Pokok Hasil Rapat*:',
			points.map(function (p, idx) { return `${idx + 1}. ${p}`; }).join('\n'),
			'',
			'\uD83D\uDE4F Terima kasih atas kehadiran dan partisipasi Bapak/Ibu. Bagi yang berhalangan hadir, semoga rangkuman ini bisa menjadi informasi bersama.',
			'',
			'Salam hangat,',
			'*Mama Ira*',
			'Sekretaris Paguyuban 8i'
		].join('\n');

		return [
			'Anda adalah asisten yang menyusun pesan notulen rapat singkat dan rapi dalam Bahasa Indonesia.',
			'Gunakan format persis seperti berikut, tanpa menambahkan heading lain, tanpa bullet tambahan selain penomoran 1..n.',
			'Sesuaikan bagian Pokok Hasil Rapat dengan poin yang diberikan pengguna. Jangan mengubah nama paguyuban.',
			'',
			exampleFormat
		].join('\n');
	}

	async function callGemini(prompt) {
		const body = {
			contents: [
				{ role: 'user', parts: [{ text: prompt }] }
			]
		};

		const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		if (!res.ok) {
			throw new Error('Gagal menghubungi Gemini API: ' + res.status + ' ' + res.statusText);
		}

		const data = await res.json();
		// Struktur v1beta: candidates[0].content.parts[0].text
		const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
		if (!text) {
			throw new Error('Respons Gemini tidak berisi teks.');
		}
		return text.trim();
	}

	function updateDateNow() {
		const now = new Date();
		dateInput.value = formatDateIndonesian(now);
	}

	function resetFormAndResult() {
		// Reset form values
		document.getElementById('meetingForm').reset();
		updateDateNow();
		pointsContainer.innerHTML = '';
		for (var i = 0; i < 3; i++) {
			pointsContainer.appendChild(createPointRow());
		}
		resultText.value = '';
		shareBtn.disabled = true;
		
		// Add reset animation
		document.querySelectorAll('.card').forEach(card => {
			card.style.animation = 'none';
			card.offsetHeight; // Trigger reflow
			card.style.animation = 'slideInUp 0.6s ease-out';
		});
	}

	// Enhanced add point button with animation
	addPointBtn.addEventListener('click', function () {
		const newRow = createPointRow();
		pointsContainer.appendChild(newRow);
		
		// Focus on the new textarea
		setTimeout(() => {
			newRow.querySelector('textarea').focus();
		}, 100);
		
		// Add button click animation
		this.classList.add('clicked');
		setTimeout(() => {
			this.classList.remove('clicked');
		}, 200);
	});

	generateBtn.addEventListener('click', async function () {
		const tanggal = dateInput.value.trim();
		const waktu = timeSelect.value;
		const points = getPoints();

		if (!waktu) {
			showNotification('Silakan pilih waktu rapat.', 'warning');
			return;
		}
		if (points.length === 0) {
			showNotification('Isi minimal satu poin hasil rapat.', 'warning');
			return;
		}

		const prompt = buildPrompt({ tanggal: tanggal, waktu: waktu, points: points });

		resultText.value = 'Menyusun pesan dengan Gemini...';
		resultText.classList.add('loading');
		generateBtn.classList.add('loading');
		generateBtn.disabled = true;
		
		// Add loading animation to the result card
		document.querySelector('.card:nth-child(2)').classList.add('processing');
		
		try {
			const generated = await callGemini(prompt);
			resultText.value = generated;
			shareBtn.disabled = generated.trim().length === 0;
			if (!shareBtn.disabled) {
				shareBtn.classList.add('enabled-bump');
				setTimeout(function () { shareBtn.classList.remove('enabled-bump'); }, 600);
				showNotification('Pesan berhasil dibuat!', 'success');
			}
		} catch (err) {
			console.error(err);
			resultText.value = 'Terjadi kesalahan: ' + (err && err.message ? err.message : String(err));
			shareBtn.disabled = true;
			showNotification('Terjadi kesalahan saat membuat pesan.', 'error');
		} finally {
			generateBtn.disabled = false;
			resultText.classList.remove('loading');
			generateBtn.classList.remove('loading');
			document.querySelector('.card:nth-child(2)').classList.remove('processing');
		}
	});

	resetBtn.addEventListener('click', function () {
		// delay to allow default reset
		setTimeout(resetFormAndResult, 0);
	});

	shareBtn.addEventListener('click', function () {
		const text = resultText.value.trim();
		if (!text) return;
		const url = 'https://wa.me/?text=' + encodeURIComponent(text);
		window.open(url, '_blank');
		
		// Add share animation
		this.classList.add('shared');
		setTimeout(() => {
			this.classList.remove('shared');
		}, 300);
	});

	// Notification system
	function showNotification(message, type = 'info') {
		const notification = document.createElement('div');
		notification.className = `notification notification-${type}`;
		notification.innerHTML = `
			<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
			<span>${message}</span>
		`;
		
		document.body.appendChild(notification);
		
		// Animate in
		setTimeout(() => {
			notification.classList.add('show');
		}, 100);
		
		// Remove after 3 seconds
		setTimeout(() => {
			notification.classList.remove('show');
			setTimeout(() => {
				if (notification.parentNode) {
					notification.parentNode.removeChild(notification);
				}
			}, 300);
		}, 3000);
	}

	// Enhanced form interactions
	timeSelect.addEventListener('change', function() {
		if (this.value) {
			this.classList.add('selected');
		} else {
			this.classList.remove('selected');
		}
	});

	// Add input focus effects
	document.querySelectorAll('input, select, textarea').forEach(input => {
		input.addEventListener('focus', function() {
			this.parentElement.classList.add('focused');
		});
		
		input.addEventListener('blur', function() {
			this.parentElement.classList.remove('focused');
		});
	});

	// Init
	updateDateNow();
	for (var i = 0; i < 3; i++) {
		pointsContainer.appendChild(createPointRow());
	}
	updateAddRemoveState();
})();

