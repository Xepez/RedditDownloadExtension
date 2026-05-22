// -----------------------------
// Generic button creator
// -----------------------------
function createDownloadButton(url) {
    const btn = document.createElement('button');
    btn.innerText = 'Download';
    btn.className = 'my-download-btn';
    btn.style.margin = '5px';
    btn.style.padding = '2px 5px';
    btn.style.fontSize = '11px';
    btn.style.cursor = 'pointer';

    btn.onclick = () => {
        browser.runtime.sendMessage({
            action: 'download',
            url
        });
    };

    return btn;
}

// -----------------------------
// Handle image/video posts
// -----------------------------
function addDownloadButtonToPost(post) {
    if (post.querySelector('.my-download-btn')) return;

    let mediaLink = null;

    // 1. Direct image thumbnails
    const thumb = post.querySelector('a.thumbnail');
    if (
        thumb &&
        thumb.href &&
        /\.(jpg|jpeg|png|gif|webp)$/i.test(thumb.href)
    ) {
        mediaLink = thumb.href;
    }

    // 2. Preview / expando image
    if (!mediaLink) {
        const img = post.querySelector('.expando img, .preview img');
        if (img?.src) {
            mediaLink = img.src;
        }
    }

    if (!mediaLink) return;

    const entry = post.querySelector('.entry');
    if (!entry) return;

    entry.appendChild(createDownloadButton(mediaLink));
}

// -----------------------------
// Handle comment images
// -----------------------------
function addDownloadButtonsToComment(comment) {
    // Prevent reprocessing
    if (comment.dataset.downloadProcessed) return;
    comment.dataset.downloadProcessed = 'true';

    // Find links inside comments
    const links = comment.querySelectorAll('a[href]:not(.title)');

    links.forEach((link) => {
        const href = link.href;
        if (!href) return;

        // Match Reddit image/media URLs
        const isImage =
            /\.(jpg|jpeg|png|gif|webp)$/i.test(href) ||
            href.includes('i.redd.it') ||
            href.includes('preview.redd.it') ||
            href.includes('redditmedia.com');

        if (!isImage) return;

        const btn = document.createElement('button');
        btn.innerText = 'Download';
        btn.className = 'my-download-btn';
        btn.style.marginLeft = '6px';
        btn.style.fontSize = '11px';
        btn.style.cursor = 'pointer';

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            browser.runtime.sendMessage({
                action: 'download',
                url: href
            });
        };

        // Add button right after the image link
        link.insertAdjacentElement('afterend', btn);
    });
}

// -----------------------------
// Handle Reddit galleries
// -----------------------------
function addDownloadButtonToGallery(post) {
    if (post.querySelector('.my-gallery-download-btn')) return;

    const titleLink = post.querySelector('a.title');
    if (!titleLink?.href || !titleLink?.href.includes("gallery")) return;

    const postUrl = titleLink.href;

    const btn = document.createElement('button');
    btn.innerText = 'Download Gallery';
    btn.className = 'my-gallery-download-btn';
    btn.style.margin = '5px';
    btn.style.padding = '2px 5px';
    btn.style.fontSize = '11px';
    btn.style.cursor = 'pointer';

    btn.onclick = async () => {
        try {
            // Reddit JSON endpoint
            const jsonUrl = postUrl.replace(/\/$/, '') + '.json';

            const response = await fetch(jsonUrl);
            const data = await response.json();

            const postData =
                data?.[0]?.data?.children?.[0]?.data;

            if (!postData?.media_metadata) {
                console.log('No gallery metadata found');
                return;
            }

            const mediaMetadata =
                postData.media_metadata;

            const urls = Object.values(mediaMetadata)
                .map((item) => {
                    const source =
                        item?.s?.u || item?.s?.gif;

                    return source
                        ? source.replace(/&amp;/g, '&')
                        : null;
                })
                .filter(Boolean);

            urls.forEach((url) => {
                browser.runtime.sendMessage({
                    action: 'download',
                    url,
                });
            });

            console.log(
                `Downloaded ${urls.length} gallery images`
            );
        } catch (err) {
            console.error(
                'Gallery download failed:',
                err
            );
        }
    };

    const entry = post.querySelector('.entry');
    if (!entry) return;

    entry.appendChild(btn);
}

// -----------------------------
// Handle video posts
// -----------------------------
function addDownloadButtonToVideo(post) {
    // Prevent duplicate buttons
    if (post.querySelector('.my-video-download-btn')) {
        return;
    }

    const commentsLink =
        post.querySelector('a.comments');

    if (!commentsLink?.href) {
        return;
    }

    // Detect Reddit-hosted video post
    const outgoingLink =
        post.querySelector('a.title');

    const videoTag =
        post.querySelector('video');

    const isRedditVideo =
        outgoingLink?.href?.includes('v.redd.it') ||
        post.dataset.domain === 'v.redd.it' ||
        !!videoTag;

    // Skip non-video posts
    if (!isRedditVideo) {
        return;
    }

    const btn =
        document.createElement('button');

    btn.innerText =
        'Download Video';

    btn.className =
        'my-video-download-btn';

    btn.style.margin = '5px';
    btn.style.padding = '2px 5px';
    btn.style.fontSize = '11px';
    btn.style.cursor = 'pointer';

    btn.onclick = async () => {
        try {
            const jsonUrl =
                commentsLink.href.replace(
                    /\/$/,
                    ''
                ) + '.json';

            const response =
                await fetch(jsonUrl);

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const data =
                await response.json();

            const postData =
                data?.[0]
                    ?.data
                    ?.children?.[0]
                    ?.data;

            const redditVideo =
                postData?.media
                    ?.reddit_video;

            if (
                !redditVideo?.fallback_url
            ) {
                console.log(
                    'No Reddit video found'
                );
                return;
            }

            const videoUrl =
                redditVideo.fallback_url;

            const parsed =
                new URL(videoUrl);

            const baseUrl =
                parsed.origin +
                parsed.pathname.substring(
                    0,
                    parsed.pathname.lastIndexOf('/') + 1
                );

            const audioCandidates = [
                // DASH
                `${baseUrl}DASH_AUDIO_128.mp4`,
                `${baseUrl}DASH_AUDIO.mp4`,
                `${baseUrl}DASH_audio.mp4`,

                // CMAF
                `${baseUrl}CMAF_AUDIO_128.mp4`,
                `${baseUrl}CMAF_AUDIO.mp4`,

                // fallback
                `${baseUrl}audio`
            ];

            browser.runtime.sendMessage({
                action: 'downloadVideoWithAudio',
                videoUrl,
                audioCandidates
            });

        } catch (err) {
            console.error('Video download failed:', err);
        }
    };

    const entry = post.querySelector('.entry');

    if (entry) {
        entry.appendChild(btn);
    }
}

// -----------------------------
// Handle Redgifs posts
// -----------------------------
function addDownloadButtonToRedgifs(post) {
    // Prevent duplicate buttons
    if (post.querySelector('.my-redgifs-download-btn')) {
        return;
    }

    const titleLink = post.querySelector('a.title');

    if (!titleLink?.href) {
        return;
    }

    const href = titleLink.href.toLowerCase();

    const isRedgifs = href.includes('redgifs.com');

    if (!isRedgifs) {
        return;
    }

    const btn = document.createElement('button');
    btn.innerText = 'Download Redgifs';
    btn.className = 'my-redgifs-download-btn';
    btn.style.margin = '5px';
    btn.style.padding = '2px 5px';
    btn.style.fontSize = '11px';
    btn.style.cursor = 'pointer';

    btn.onclick = async () => {
        try {
            console.log('Sending Redgifs download:', titleLink.href);

            browser.runtime.sendMessage({
                action: 'downloadRedgifs',
                pageUrl: titleLink.href
            });

        } catch (err) {
            console.error('Redgifs download failed:', err);
        }
    };

    const entry = post.querySelector('.entry');

    if (entry) {
        entry.appendChild(btn);
    }
}

// -----------------------------
// Process everything
// -----------------------------
function processPage() {
    // Posts
    const posts = document.querySelectorAll(
        'div.thing'
    );
    posts.forEach((post) => {
        addDownloadButtonToPost(post);
        addDownloadButtonToGallery(post);
        addDownloadButtonToVideo(post);
        addDownloadButtonToRedgifs(post);
    });

    // Comments
    const comments = document.querySelectorAll(
        '.comment'
    );
    comments.forEach(addDownloadButtonsToComment);
}

// -----------------------------
// Observe DOM changes
// -----------------------------
const observer = new MutationObserver(() => {
    processPage();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Initial run
processPage();