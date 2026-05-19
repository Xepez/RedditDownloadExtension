// Function to add download button to a single post
function addDownloadButton(post) {
    if (post.querySelector('.my-download-btn')) return; // already added

    // Try to find media link
    let mediaLink = null;

    // 1. Direct image thumbnails
    const thumb = post.querySelector('a.thumbnail');
    if (thumb && thumb.href && /\.(jpg|jpeg|png|gif)$/.test(thumb.href)) {
        mediaLink = thumb.href;
    }

    // 2. Image previews inside .expando or .preview
    if (!mediaLink) {
        const img = post.querySelector('.expando img, .preview img');
        if (img && img.src) mediaLink = img.src;
    }

    // 3. Video tags
    if (!mediaLink) {
        const video = post.querySelector('video');
        if (video && (video.src || video.currentSrc)) mediaLink = video.src || video.currentSrc;
    }

    // If no media found, skip
    if (!mediaLink) return;

    // Create button
    const btn = document.createElement('button');
    btn.innerText = "Download";
    btn.className = "my-download-btn";
    btn.style.margin = "5px";
    btn.style.padding = "2px 5px";
    btn.style.fontSize = "11px";
    btn.style.cursor = "pointer";

    btn.onclick = () => {
        chrome.runtime.sendMessage({ action: "download", url: mediaLink });
    };

    // Append button to the post title area or footer
    const entry = post.querySelector('.entry');
    if (entry) entry.appendChild(btn);
}

// Process all posts currently in DOM
function processPosts() {
    const posts = document.querySelectorAll('div.thing');
    posts.forEach(addDownloadButton);
}

// Observe DOM changes (for dynamically loaded posts)
const observer = new MutationObserver(processPosts);
observer.observe(document.body, { childList: true, subtree: true });

// Initial run
processPosts();