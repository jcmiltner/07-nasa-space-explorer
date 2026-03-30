// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');
const imageModal = document.getElementById('imageModal');
const closeModalButton = document.getElementById('closeModalButton');
const modalImage = document.getElementById('modalImage');
const modalVideo = document.getElementById('modalVideo');
const modalVideoLinkWrapper = document.getElementById('modalVideoLinkWrapper');
const modalVideoLink = document.getElementById('modalVideoLink');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

// NASA APOD endpoint with the provided API key
const apodApiUrl = 'https://api.nasa.gov/planetary/apod?api_key=dtr7OIsjPI86XWtXPTF7iAYXLV0wQY5WYYTIKLsb&thumbs=true';
let currentGalleryImages = [];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// Show a simple loading message while we wait for NASA's response
function showLoadingState() {
	gallery.innerHTML = `
		<div class="placeholder">
			<div class="placeholder-icon">🚀</div>
			<p>Loading space images...</p>
		</div>
	`;
}

function showErrorState(message) {
	gallery.innerHTML = `
		<div class="placeholder">
			<div class="placeholder-icon">⚠️</div>
			<p>${message}</p>
		</div>
	`;
}

function getYouTubeVideoId(videoUrl) {
	try {
		const parsedUrl = new URL(videoUrl);
		const host = parsedUrl.hostname;

		if (host.includes('youtube.com')) {
			if (parsedUrl.pathname === '/watch') {
				return parsedUrl.searchParams.get('v');
			}

			if (parsedUrl.pathname.startsWith('/embed/')) {
				return parsedUrl.pathname.replace('/embed/', '').split('/')[0];
			}
		}

		if (host.includes('youtu.be')) {
			return parsedUrl.pathname.replace('/', '');
		}
	} catch (error) {
		return null;
	}

	return null;
}

function getVideoPreviewImageUrl(item) {
	if (item.thumbnail_url) {
		return item.thumbnail_url;
	}

	const youtubeVideoId = getYouTubeVideoId(item.url);

	if (youtubeVideoId) {
		return `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
	}

	return null;
}

function renderGallery(apodItems) {
	if (apodItems.length === 0) {
		showErrorState('No APOD entries found for this date range. Please try different dates.');
		return;
	}

	// Show newest entries first
	const sortedImages = apodItems.sort((a, b) => new Date(b.date) - new Date(a.date));
	currentGalleryImages = sortedImages;

	const cardsHtml = sortedImages
		.map((item, index) => {
			const videoPreviewUrl = item.media_type === 'video' ? getVideoPreviewImageUrl(item) : null;
			const previewMedia = item.media_type === 'image'
				? `<img src="${item.url}" alt="${item.title}" />`
				: videoPreviewUrl
					? `<img src="${videoPreviewUrl}" alt="Thumbnail for video: ${item.title}" />`
					: '<div class="gallery-media-placeholder">🎬 Video</div>';

			const mediaBadge = item.media_type === 'video' ? '<span class="media-badge">Video</span>' : '';

			return `
				<article class="gallery-item" data-index="${index}" role="button" tabindex="0" aria-label="Open details for ${item.title}">
					${previewMedia}
					${mediaBadge}
					<p><strong>${item.title}</strong></p>
					<p>${item.date}</p>
				</article>
			`;
		})
		.join('');

	gallery.innerHTML = cardsHtml;
}

function getVideoEmbedUrl(videoUrl) {
	try {
		const parsedUrl = new URL(videoUrl);
		const host = parsedUrl.hostname;

		if (host.includes('youtube.com')) {
			if (parsedUrl.pathname === '/watch') {
				const videoId = parsedUrl.searchParams.get('v');

				if (videoId) {
					return `https://www.youtube.com/embed/${videoId}`;
				}
			}

			if (parsedUrl.pathname.startsWith('/embed/')) {
				return videoUrl;
			}
		}

		if (host.includes('youtu.be')) {
			const videoId = parsedUrl.pathname.replace('/', '');

			if (videoId) {
				return `https://www.youtube.com/embed/${videoId}`;
			}
		}

		if (host.includes('vimeo.com')) {
			const videoId = parsedUrl.pathname.split('/').filter(Boolean).pop();

			if (videoId) {
				return `https://player.vimeo.com/video/${videoId}`;
			}
		}
	} catch (error) {
		return null;
	}

	return null;
}

function openModal(item) {
	modalImage.classList.add('hidden');
	modalVideo.classList.add('hidden');
	modalVideoLinkWrapper.classList.add('hidden');

	if (item.media_type === 'video') {
		const embedUrl = getVideoEmbedUrl(item.url);

		if (embedUrl) {
			modalVideo.src = embedUrl;
			modalVideo.classList.remove('hidden');
		} else {
			modalVideoLink.href = item.url;
			modalVideoLinkWrapper.classList.remove('hidden');
		}
	} else {
		modalImage.src = item.hdurl || item.url;
		modalImage.alt = item.title;
		modalImage.classList.remove('hidden');
	}

	modalTitle.textContent = item.title;
	modalDate.textContent = item.date;
	modalExplanation.textContent = item.explanation;

	imageModal.classList.remove('hidden');
	imageModal.setAttribute('aria-hidden', 'false');
	document.body.style.overflow = 'hidden';
}

function closeModal() {
	imageModal.classList.add('hidden');
	imageModal.setAttribute('aria-hidden', 'true');
	document.body.style.overflow = '';
	modalImage.src = '';
	modalVideo.src = '';
	modalVideoLink.href = '#';
}

function openModalFromCard(cardElement) {
	const itemIndex = Number(cardElement.dataset.index);
	const selectedItem = currentGalleryImages[itemIndex];

	if (!selectedItem) {
		return;
	}

	openModal(selectedItem);
}

async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate) {
		showErrorState('Please choose both a start date and an end date.');
		return;
	}

	if (startDate > endDate) {
		showErrorState('Start date must be before or equal to end date.');
		return;
	}

	const requestUrl = `${apodApiUrl}&start_date=${startDate}&end_date=${endDate}`;

	showLoadingState();
	getImagesButton.disabled = true;

	try {
		const response = await fetch(requestUrl);

		if (!response.ok) {
			throw new Error('Unable to load NASA images right now.');
		}

		const data = await response.json();
		const apodItems = Array.isArray(data) ? data : [data];
		renderGallery(apodItems);
	} catch (error) {
		showErrorState(error.message);
	} finally {
		getImagesButton.disabled = false;
	}
}

// Run the API request when the user clicks the button
getImagesButton.addEventListener('click', getSpaceImages);

// Open image details when users click a card
gallery.addEventListener('click', (event) => {
	const card = event.target.closest('.gallery-item');

	if (!card) {
		return;
	}

	openModalFromCard(card);
});

// Make cards keyboard accessible (Enter or Space)
gallery.addEventListener('keydown', (event) => {
	if (event.key !== 'Enter' && event.key !== ' ') {
		return;
	}

	const card = event.target.closest('.gallery-item');

	if (!card) {
		return;
	}

	event.preventDefault();
	openModalFromCard(card);
});

// Close modal from the close button
closeModalButton.addEventListener('click', closeModal);

// Close modal when clicking outside the content panel
imageModal.addEventListener('click', (event) => {
	if (event.target === imageModal) {
		closeModal();
	}
});

// Close modal with the Escape key
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !imageModal.classList.contains('hidden')) {
		closeModal();
	}
});
