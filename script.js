// ---------- Gallery (Sanity) ----------
const SANITY_PROJECT_ID = "578ekfoi";   // from sanity.io/manage
const SANITY_DATASET = "production";

async function loadGallery() {
    const grid = document.getElementById("gallery-grid");
    if (!grid) return;   // not on the gallery page, so do nothing

    const query = `*[_type == "galleryPhoto"] | order(_createdAt desc){
        alt, category, "url": image.asset->url
    }`;
    const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Request failed: " + res.status);
        const result = await sanityFetch(query);

        if (result.length === 0) {
            grid.textContent = "No photos yet. Check back soon.";
            return;
        }

        grid.replaceChildren(...result.map(photo => {
            const figure = document.createElement("figure");
            figure.className = "gallery-item";
            figure.dataset.category = photo.category || "";

            const img = document.createElement("img");
            img.src = `${photo.url}?w=800&auto=format`;
            img.alt = photo.alt;
            img.loading = "lazy";

            figure.append(img);
            return figure;
        }));

    } catch (error) {
        console.error(error);
        grid.textContent = "Photos couldn't be loaded right now. Please try again later.";
    }
}

// Filter buttons (looks up the photos at click time, so it works with fetched photos)
document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        button.classList.add("active");

        const category = button.dataset.filter;
        document.querySelectorAll(".gallery-item").forEach(item => {
            item.hidden = !(category === "all" || item.dataset.category === category);
        });
    });
});

// Click a photo to enlarge it (one listener on the grid, so it works for fetched photos)
const galleryGrid = document.getElementById("gallery-grid");
const lightbox = document.querySelector(".lightbox");

if (galleryGrid && lightbox) {
    const lightboxImg = lightbox.querySelector("img");

    galleryGrid.addEventListener("click", event => {
        const item = event.target.closest(".gallery-item");
        if (!item) return;

        const img = item.querySelector("img");
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.hidden = false;
    });

    lightbox.addEventListener("click", () => lightbox.hidden = true);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") lightbox.hidden = true;
    });
}


async function sanityFetch(query) {
    const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Request failed: " + res.status);
    const { result } = await res.json();
    return result;
}

function formatDate(isoDate) {
    return new Date(isoDate).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
    });
}

// ---------- News ----------
function buildNewsCard(item) {
    const card = document.createElement("article");
    card.className = "card";

    const img = document.createElement("img");
    img.src = `${item.url}?w=800&auto=format`;
    img.alt = item.alt;
    img.loading = "lazy";

    const body = document.createElement("div");
    body.className = "card-body";

    const tag = document.createElement("span");
    tag.className = "card-tag";
    tag.textContent = item.category;

    const meta = document.createElement("span");
    meta.className = "card-meta";
    const time = document.createElement("time");
    time.dateTime = item.date;
    time.textContent = formatDate(item.date);
    meta.append(time);

    const title = document.createElement("h3");
    title.textContent = item.title;

    const summary = document.createElement("p");
    summary.textContent = item.summary;

    body.append(tag, meta, title, summary);
    card.append(img, body);
    return card;
}

function renderFeatured(box, item) {
    const img = document.createElement("img");
    img.src = `${item.url}?w=1200&auto=format`;
    img.alt = item.alt;

    const text = document.createElement("div");
    text.className = "mission-text";

    const tag = document.createElement("span");
    tag.className = "card-tag";
    tag.textContent = "Featured";

    const meta = document.createElement("span");
    meta.className = "card-meta";
    const time = document.createElement("time");
    time.dateTime = item.date;
    time.textContent = formatDate(item.date);
    meta.append(time);

    const title = document.createElement("h2");
    title.textContent = item.title;

    const summary = document.createElement("p");
    summary.textContent = item.summary;

    text.append(tag, meta, title, summary);
    box.replaceChildren(img, text);
}

async function loadNews() {
    const featuredBox = document.getElementById("featured-news");
    const newsGrid = document.getElementById("news-grid");
    const homeGrid = document.getElementById("home-news-grid");
    if (!featuredBox && !newsGrid && !homeGrid) return;

    const query = `*[_type == "newsItem"] | order(date desc){
        _id, title, date, category, summary, alt, featured, "url": image.asset->url
    }`;

    try {
        const items = await sanityFetch(query);

        // Home page: latest 3
        if (homeGrid) {
            homeGrid.replaceChildren(...items.slice(0, 3).map(buildNewsCard));
        }

        // News page: featured story + the rest
        if (newsGrid || featuredBox) {
            const featured = items.find(item => item.featured);
            const others = items.filter(item => item !== featured);

            if (featuredBox) {
                if (featured) {
                    renderFeatured(featuredBox, featured);
                } else {
                    featuredBox.closest("section").hidden = true;   // no featured story, hide the section
                }
            }

            if (newsGrid) {
                if (others.length === 0) {
                    newsGrid.textContent = "No news yet. Check back soon.";
                } else {
                    newsGrid.replaceChildren(...others.map(buildNewsCard));
                }
            }
        }
    } catch (error) {
        console.error(error);
        const message = "News couldn't be loaded right now. Please try again later.";
        if (homeGrid) homeGrid.textContent = message;
        if (newsGrid) newsGrid.textContent = message;
    }
}

// ---------- Notice board ----------
async function loadNotices() {
    const list = document.getElementById("notice-list");
    if (!list) return;

    try {
        const notices = await sanityFetch(
            `*[_type == "notice"] | order(date desc)[0...6]{ date, text }`
        );

        if (notices.length === 0) {
            list.textContent = "No notices at the moment.";
            return;
        }

        list.replaceChildren(...notices.map(notice => {
            const li = document.createElement("li");

            const time = document.createElement("time");
            time.className = "notice-date";
            time.dateTime = notice.date;
            time.textContent = formatDate(notice.date);

            const text = document.createElement("span");
            text.textContent = notice.text;

            li.append(time, text);
            return li;
        }));
    } catch (error) {
        console.error(error);
        list.textContent = "Notices couldn't be loaded right now.";
    }
}
// ---------- "New" dot on the News and Events link ----------
async function markNewsLink() {
    const link = document.querySelector('.nav-links a[href="news.html"]');
    if (!link) return;

    // cutoff date: 7 days ago, written as YYYY-MM-DD (the same format Sanity dates use)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const since = cutoff.toISOString().slice(0, 10);

    try {
        const count = await sanityFetch(
            `count(*[_type in ["newsItem", "notice"] && date >= "${since}"])`
        );

        if (count > 0) {
            link.classList.add("has-news");
            link.title = "New updates";
        }
    } catch (error) {
        console.error(error);   // a failed check should never break the page
    }
}

markNewsLink();

loadNews();
loadNotices();

loadGallery();

const toggle = document.querySelector(".menu-toggle");
    
    const links = document.querySelector(".nav-links");

    toggle.addEventListener("click", () => {
            const isOpen = links.classList.toggle("open");
            toggle.setAttribute("aria-expanded", isOpen);
        });

        // close the menu after tapping a link
    links.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => links.classList.remove("open"));
        });

document.querySelectorAll(".inquiry-form").forEach(form => {
    const status = form.querySelector(".form-status");
    const button = form.querySelector("button[type='submit']");

    form.addEventListener("submit", async event => {
        event.preventDefault();

        button.disabled = true;
        status.className = "form-status";
        status.textContent = "Sending...";

        try {
            const res = await fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                headers: { Accept: "application/json" }
            });
            if (!res.ok) throw new Error("Request failed: " + res.status);

            form.reset();
            status.classList.add("success");
            status.textContent = "Thank you! We've received your inquiry and will contact you soon.";
        } catch (error) {
            console.error(error);
            status.classList.add("error");
            status.textContent = "Something went wrong. Please try again, or call us.";
        } finally {
            button.disabled = false;
        }
    });
});



