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

    // 3. Video
    if (!mediaLink) {
        const video = post.querySelector('video');
        if (video?.src || video?.currentSrc) {
            mediaLink = video.src || video.currentSrc;
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