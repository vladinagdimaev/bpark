const areas = document.querySelector("[data-areas]");
if (areas) {
    const tabs = Array.from(areas.querySelectorAll(".tabs a"));
    const panels = Array.from(areas.querySelectorAll(".panel"));
    let active = 0;

    function activate(index, updateHash) {
        active = index;
        tabs.forEach((tab, position) => {
            tab.setAttribute("aria-current", position === index ? "true" : "false");
            panels[position].hidden = position !== index;
        });
        tabs[index].scrollIntoView({block: "nearest", inline: "nearest"});
        if (updateHash) history.replaceState(null, "", tabs[index].hash);
    }

    function selectHash() {
        const index = tabs.findIndex(tab => tab.hash === location.hash);
        activate(Math.max(0, index), false);
    }

    tabs.forEach((tab, index) => tab.addEventListener("click", event => {
        event.preventDefault();
        activate(index, true);
    }));
    window.addEventListener("hashchange", selectHash);
    panels.forEach(panel => {
        let origin;
        panel.addEventListener("touchstart", event => {
            origin = event.touches.length === 1 ? event.touches[0] : null;
        }, {passive: true});
        panel.addEventListener("touchend", event => {
            if (!origin) return;
            const point = event.changedTouches[0];
            const deltaX = point.clientX - origin.clientX;
            const deltaY = point.clientY - origin.clientY;
            origin = null;
            if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < 1.5 * Math.abs(deltaY)) return;
            const next = active + Math.sign(deltaX);
            if (next >= 0 && next < panels.length) activate(next, true);
        }, {passive: true});

        const selector = panel.querySelector("[data-history]");
        if (selector) {
            const observations = panel.querySelectorAll("[data-observation]");
            const selectDate = () => observations.forEach(item => {
                item.hidden = item.dataset.observation !== selector.value;
            });
            selector.closest("label").hidden = false;
            selector.addEventListener("change", selectDate);
            selectDate();
        }
    });
    selectHash();
}

const imagePreview = document.querySelector("[data-upload-preview]");
if (imagePreview) {
    const inputs = Array.from(document.querySelectorAll("input[type=file]"));
    let url;
    inputs.forEach(input => input.addEventListener("change", () => {
        if (url) URL.revokeObjectURL(url);
        if (input.files[0]) {
            inputs.filter(other => other !== input).forEach(other => { other.value = ""; });
            url = URL.createObjectURL(input.files[0]);
            imagePreview.src = url;
        }
        imagePreview.hidden = !input.files[0];
    }));
}
