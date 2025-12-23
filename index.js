tailwind.config = {
    darkMode: 'class',
};

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            lang: 'en',
            translations: {
                en: {
                    title: "EOL Version Tracker",
                    subtitle: "Granular monitoring per version",
                    gridTitle: "Grid View",
                    listTitle: "List View",
                    copyUrl: "Copy URL",
                    copied: "Copied!",
                    searchPlaceholder: "Search software (e.g. kubernetes, php...)",
                    selectVersions: "Select versions",
                    emptyTitle: "Your dashboard is empty.",
                    emptySubtitle: "Search for software above to select versions to track.",
                    eolDateLabel: "EOL Date",
                    latestLabel: "Latest",
                    tableSoftware: "Software",
                    tableVersion: "Version",
                    tableEol: "EOL Date",
                    tableStatus: "Status",
                    tableActions: "Actions",
                    removeBtn: "Remove",
                    modalTitle: "Versions of {product}",
                    modalSelect: "Select",
                    closeBtn: "Close",
                    confirmBtn: "Confirm & Add",
                    footerText: "The URL contains your configuration.",
                    sourceLabel: "Data provided by",
                    apiLabel: "endoflife API",
                    viewsLabel: "Page views",
                    statusActive: "Active",
                    statusExpired: "Expired",
                    statusLessMonth: "< 1 month",
                    statusMonths: "months",
                    dateNever: "Never",
                    dateUnknown: "N/A"
                },
                it: {
                    title: "Monitor Scadenze EOL",
                    subtitle: "Monitoraggio granulare per versione",
                    gridTitle: "Vista Griglia",
                    listTitle: "Vista Elenco",
                    copyUrl: "Copia URL",
                    copied: "Copiato!",
                    searchPlaceholder: "Cerca software (es. kubernetes, php...)",
                    selectVersions: "Seleziona versioni",
                    emptyTitle: "La tua dashboard è vuota.",
                    emptySubtitle: "Cerca un software sopra per selezionare le versioni da tracciare.",
                    eolDateLabel: "Data EOL",
                    latestLabel: "Ultima",
                    tableSoftware: "Software",
                    tableVersion: "Versione",
                    tableEol: "Data EOL",
                    tableStatus: "Stato",
                    tableActions: "Azioni",
                    removeBtn: "Rimuovi",
                    modalTitle: "Versioni di {product}",
                    modalSelect: "Seleziona",
                    closeBtn: "Chiudi",
                    confirmBtn: "Conferma e Aggiungi",
                    footerText: "La configurazione è salvata nell'URL.",
                    sourceLabel: "Dati forniti da",
                    apiLabel: "endoflife API",
                    viewsLabel: "Visualizzazioni",
                    statusActive: "Attivo",
                    statusExpired: "Scaduto",
                    statusLessMonth: "< 1 mese",
                    statusMonths: "mesi",
                    dateNever: "Mai",
                    dateUnknown: "N/D"
                }
            },

            viewMode: 'grid',
            allProductsList: [],
            searchQuery: '',
            filteredProducts: [],

            showModal: false,
            modalLoading: false,
            currentModalProduct: '',
            currentModalProductLabel: '', // Nome visuale
            currentProductData: [],
            tempSelectedCycles: [],

            trackedItems: [],
            isLoading: false,
            urlCopied: false,
            visitCount: 0,
            isDark: false
        }
    },
    async mounted() {
        // Theme init
        const savedTheme = localStorage.getItem('eolTheme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            this.isDark = true;
            document.documentElement.classList.add('dark');
        }

        const userLang = navigator.language || navigator.userLanguage;
        if (userLang && userLang.startsWith('it')) {
            this.lang = 'it';
        } else {
            this.lang = 'en';
        }

        const savedView = localStorage.getItem('eolViewMode');
        if (savedView) this.viewMode = savedView;

        // Fetch della lista prodotti aggiornata alla v1
        try {
            const res = await fetch('https://endoflife.date/api/v1/products');
            const data = await res.json();
            this.allProductsList = data.result;
        } catch (e) { console.error("Err fetch list", e); }

        await this.restoreFromUrl();

        try {
            const res = await fetch('https://api.countapi.xyz/hit/eol-monitor-app/visits');
            const data = await res.json();
            this.visitCount = data.value;
        } catch (e) { /* ignore error */ }
    },
    methods: {
        setTheme(mode) {
            this.isDark = (mode === 'dark');
            if (this.isDark) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('eolTheme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('eolTheme', 'light');
            }
        },

        t(key) {
            return this.translations[this.lang][key] || key;
        },

        // Nuovo helper per ottenere il label dal product ID
        getProductLabel(productId) {
            const found = this.allProductsList.find(p => p.name === productId);
            return found ? found.label : productId;
        },

        setViewMode(mode) {
            this.viewMode = mode;
            localStorage.setItem('eolViewMode', mode);
        },

        filterProducts() {
            if (this.searchQuery.length < 2) {
                this.filteredProducts = [];
                return;
            }
            const q = this.searchQuery.toLowerCase();
            // Ricerca più intelligente: cerca in name, label e aliases
            this.filteredProducts = this.allProductsList
                .filter(p => {
                    const inName = p.name.toLowerCase().includes(q);
                    const inLabel = p.label.toLowerCase().includes(q);
                    const inAlias = p.aliases.some(a => a.toLowerCase().includes(q));
                    return inName || inLabel || inAlias;
                })
                .slice(0, 8);
        },

        async openVersionSelector(productObj) {
            this.currentModalProduct = productObj.name; // Usiamo lo slug (es. adonisjs) per le API
            this.currentModalProductLabel = productObj.label; // Usiamo il label per il titolo (es. AdonisJS)

            this.showModal = true;
            this.modalLoading = true;
            this.tempSelectedCycles = [];
            this.filteredProducts = [];
            this.searchQuery = '';

            try {
                const res = await fetch(`https://endoflife.date/api/${productObj.name}.json`);
                this.currentProductData = await res.json();
            } catch (e) {
                alert("API Error");
            } finally {
                this.modalLoading = false;
            }
        },

        isCycleSelected(cycleStr) {
            return this.tempSelectedCycles.includes(cycleStr);
        },

        toggleSelection(cycleData) {
            const c = cycleData.cycle;
            if (this.tempSelectedCycles.includes(c)) {
                this.tempSelectedCycles = this.tempSelectedCycles.filter(x => x !== c);
            } else {
                this.tempSelectedCycles.push(c);
            }
        },

        closeModal() {
            this.showModal = false;
            this.currentModalProduct = '';
            this.currentProductData = [];
        },

        confirmSelection() {
            this.tempSelectedCycles.forEach(cycleStr => {
                const cycleData = this.currentProductData.find(x => x.cycle === cycleStr);
                const exists = this.trackedItems.some(t => t.product === this.currentModalProduct && t.cycle === cycleStr);

                if (!exists && cycleData) {
                    this.trackedItems.push({
                        id: `${this.currentModalProduct}-${cycleStr}`,
                        product: this.currentModalProduct,
                        cycle: cycleStr,
                        eol: cycleData.eol,
                        lts: cycleData.lts,
                        latest: cycleData.latest
                    });
                }
            });
            this.updateUrl();
            this.closeModal();
        },

        removeItem(index) {
            this.trackedItems.splice(index, 1);
            this.updateUrl();
        },

        updateUrl() {
            const params = new URLSearchParams();

            this.trackedItems.forEach(item => {
                params.append('p', `${item.product}_${item.cycle}`);
            });

            const newUrl = new URL(window.location);
            newUrl.search = params.toString();

            window.history.replaceState({}, '', newUrl);
        },

        async restoreFromUrl() {
            const params = new URLSearchParams(window.location.search);
            const pValues = params.getAll('p');

            if (pValues.length === 0) return;

            this.isLoading = true;

            const pairs = pValues.map(val => {
                const separatorIndex = val.indexOf('_');
                if (separatorIndex === -1) return null;

                return {
                    product: val.substring(0, separatorIndex),
                    cycle: val.substring(separatorIndex + 1)
                };
            }).filter(x => x !== null);

            const grouped = {};
            pairs.forEach(pair => {
                if (!grouped[pair.product]) grouped[pair.product] = [];
                grouped[pair.product].push(pair.cycle);
            });

            const promises = Object.keys(grouped).map(async prod => {
                try {
                    const res = await fetch(`https://endoflife.date/api/${prod}.json`);
                    const allCycles = await res.json();
                    grouped[prod].forEach(reqCycle => {
                        const cycleData = allCycles.find(x => String(x.cycle) === String(reqCycle));
                        if (cycleData) {
                            this.trackedItems.push({
                                id: `${prod}-${reqCycle}`,
                                product: prod,
                                cycle: reqCycle,
                                eol: cycleData.eol,
                                lts: cycleData.lts,
                                latest: cycleData.latest
                            });
                        }
                    });
                } catch (e) { console.error(`Err loading ${prod}`, e); }
            });

            await Promise.all(promises);
            this.isLoading = false;
        },

        copyUrl() {
            navigator.clipboard.writeText(window.location.href);
            this.urlCopied = true;
            setTimeout(() => this.urlCopied = false, 2000);
        },

        formatDate(d) {
            if (d === false) return this.t('dateNever');
            if (!d) return this.t('dateUnknown');
            return d;
        },

        getStatusBadge(d) {
            if (!d || d === false) return 'bg-green-100 text-green-700';
            const days = this.getDaysDiff(d);
            if (days < 0) return 'bg-red-100 text-red-700';
            if (days < 180) return 'bg-yellow-100 text-yellow-700';
            return 'bg-green-100 text-green-700';
        },

        getBarColor(d) {
            if (!d || d === false) return 'bg-green-500';
            const days = this.getDaysDiff(d);
            if (days < 0) return 'bg-red-500';
            if (days < 180) return 'bg-yellow-500';
            return 'bg-green-500';
        },

        getStatusText(d) {
            if (!d || d === false) return this.t('statusActive');
            const days = this.getDaysDiff(d);
            if (days < 0) return this.t('statusExpired');
            if (days < 30) return this.t('statusLessMonth');
            return Math.floor(days / 30) + ' ' + this.t('statusMonths');
        },

        getStatusTextClass(d) {
            const days = this.getDaysDiff(d);
            if (days < 0) return 'text-red-600 font-bold';
            if (days < 180) return 'text-yellow-600 font-bold';
            return 'text-green-600';
        },

        getDateColor(d) {
            const days = this.getDaysDiff(d);
            return days < 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-200';
        },

        getDaysDiff(dateString) {
            if (!dateString) return 9999;
            return Math.ceil((new Date(dateString) - new Date()) / (1000 * 60 * 60 * 24));
        }
    }
});

window.vueApp = app.mount('#app');
