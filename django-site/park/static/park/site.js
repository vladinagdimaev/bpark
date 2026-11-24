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

function bindPhotoPreview(container) {
    const imagePreview = container.querySelector("[data-upload-preview]");
    if (!imagePreview) return;
    const saved = container.querySelector("[data-saved-photo]");
    const inputs = Array.from(container.querySelectorAll("input[type=file]"));
    let url;
    inputs.forEach(input => input.addEventListener("change", () => {
        if (url) URL.revokeObjectURL(url);
        if (input.files[0]) {
            inputs.filter(other => other !== input).forEach(other => { other.value = ""; });
            url = URL.createObjectURL(input.files[0]);
            imagePreview.src = url;
        }
        imagePreview.hidden = !input.files[0];
        if (saved) saved.hidden = !imagePreview.hidden;
    }));
}

const survey = document.querySelector("[data-survey]");
if (survey) {
    const list = survey.querySelector("[data-area-list]");
    const template = survey.querySelector("[data-empty-area]");
    const total = survey.elements["areas-TOTAL_FORMS"];
    const add = survey.querySelector("[data-add-area]");
    const previous = new Map(Array.from(survey.querySelectorAll("[data-previous]"), item => [
        item.dataset.previous, item.content,
    ]));
    const fields = () => Array.from(list.querySelectorAll("[data-area-form]"));
    const selectArea = row => row.querySelector('select[name$="-area"]');
    const remove = row => row.querySelector('input[name$="-DELETE"]');
    const updateOptions = () => {
        const active = fields().filter(row => !remove(row).checked);
        const used = new Set(active.map(row => selectArea(row).value));
        active.forEach(row => {
            const select = selectArea(row);
            Array.from(select.options).forEach(option => {
                option.disabled = Boolean(option.value && option.value !== select.value && used.has(option.value));
            });
        });
        add.disabled = active.length >= 11;
    };
    const bindArea = row => {
        bindPhotoPreview(row);
        const select = selectArea(row);
        const title = row.querySelector("[data-area-title]");
        const history = row.querySelector("[data-previous-report]");
        const update = () => {
            title.textContent = select.value ? select.selectedOptions[0].textContent : "אזור חדש";
            const content = previous.get(select.value);
            history.replaceChildren(...(content ? [content.cloneNode(true)] : []));
            updateOptions();
        };
        select.addEventListener("change", update);
        remove(row).addEventListener("change", updateOptions);
        update();
    };
    fields().forEach(bindArea);
    add.hidden = false;
    updateOptions();
    add.addEventListener("click", () => {
        const index = Number(total.value);
        list.insertAdjacentHTML("beforeend", template.innerHTML.replaceAll("__prefix__", index));
        total.value = index + 1;
        const row = list.lastElementChild;
        bindArea(row);
        selectArea(row).focus();
    });
} else {
    bindPhotoPreview(document);
}
