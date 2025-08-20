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
		row.className = 'point-row';

		const textarea = document.createElement('textarea');
		textarea.placeholder = 'Tulis poin hasil rapat...';
		textarea.value = value;

		const removeBtn = document.createElement('button');
		removeBtn.type = 'button';
		removeBtn.className = 'btn danger icon';
		removeBtn.title = 'Hapus poin';
		removeBtn.textContent = '✕';
		removeBtn.addEventListener('click', function () {
			pointsContainer.removeChild(row);
			updateAddRemoveState();
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
			'\uD83D\uDCCC Notulen/Rangkuman Rapat Paguyuban Kelas 8i SMPN 04 Malang',
			`Hari/Tanggal : ${tanggal}`,
			`Waktu : ${waktu}`,
			'',
			'Pokok Hasil Rapat:',
			points.map(function (p, idx) { return `${idx + 1}. ${p}`; }).join('\n'),
			'',
			'\uD83D\uDE4F Terima kasih atas kehadiran dan partisipasi Bapak/Ibu. Bagi yang berhalangan hadir, semoga rangkuman ini bisa menjadi informasi bersama.',
			'',
			'Salam hangat,',
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
	}

	addPointBtn.addEventListener('click', function () {
		pointsContainer.appendChild(createPointRow());
	});

	generateBtn.addEventListener('click', async function () {
		const tanggal = dateInput.value.trim();
		const waktu = timeSelect.value;
		const points = getPoints();

		if (!waktu) {
			alert('Silakan pilih waktu rapat.');
			return;
		}
		if (points.length === 0) {
			alert('Isi minimal satu poin hasil rapat.');
			return;
		}

		const prompt = buildPrompt({ tanggal: tanggal, waktu: waktu, points: points });

		resultText.value = 'Menyusun pesan dengan Gemini...';
		generateBtn.disabled = true;
		try {
			const generated = await callGemini(prompt);
			resultText.value = generated;
			shareBtn.disabled = generated.trim().length === 0;
		} catch (err) {
			console.error(err);
			resultText.value = 'Terjadi kesalahan: ' + (err && err.message ? err.message : String(err));
			shareBtn.disabled = true;
		} finally {
			generateBtn.disabled = false;
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
	});

	// Init
	updateDateNow();
	for (var i = 0; i < 3; i++) {
		pointsContainer.appendChild(createPointRow());
	}
	updateAddRemoveState();
})();


