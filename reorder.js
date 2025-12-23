(function () {
    const initSortable = () => {
        // We need the Vue app instance to sync data
        if (!window.vueApp) return;

        const handleSort = (evt) => {
            const { oldIndex, newIndex } = evt;
            if (oldIndex === newIndex) return;

            // Vue 3 Proxy reactive arrays need careful handling
            // We get a copy, modify it, and re-assign it to trigger high-level reactivity
            const items = [...window.vueApp.trackedItems];
            const movedItem = items.splice(oldIndex, 1)[0];
            items.splice(newIndex, 0, movedItem);

            window.vueApp.trackedItems = items;

            // Sync URL immediately
            if (typeof window.vueApp.updateUrl === 'function') {
                window.vueApp.updateUrl();
            }
        };

        const gridEl = document.getElementById('grid-container');
        if (gridEl && !gridEl._sortable) {
            new Sortable(gridEl, {
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                onEnd: handleSort
            });
        }

        const listEl = document.getElementById('list-container');
        if (listEl && !listEl._sortable) {
            new Sortable(listEl, {
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                onEnd: handleSort
            });
        }
    };

    // Use MutationObserver to detect when Vue renders the containers (v-if)
    const observer = new MutationObserver((mutations) => {
        initSortable();
    });

    // Start observing the #app element for changes in children
    const startObserver = () => {
        const appEl = document.getElementById('app');
        if (appEl) {
            observer.observe(appEl, { childList: true, subtree: true });
            initSortable();
        } else {
            setTimeout(startObserver, 100);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
    } else {
        startObserver();
    }
})();
