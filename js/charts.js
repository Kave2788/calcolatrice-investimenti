const charts = {};

function mkOpts(opts = {}) {
    const yScale = {
        ticks: {
            color: 'rgba(255,255,255,0.32)', font: { size: 9 }, maxTicksLimit: 4,
            callback: v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1000 ? Math.round(v/1000)+'k' : v
        },
        grid:  { color: 'rgba(255,255,255,0.04)' },
        border: { display: false }
    };
    if (opts.dynamicY) yScale.beginAtZero = false;
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
            x: {
                ticks: { color: 'rgba(255,255,255,0.32)', font: { size: 9 }, maxTicksLimit: 5 },
                grid:  { display: false },
                border: { display: false }
            },
            y: yScale
        }
    };
}

function mkDataset(color, fill) {
    return { data: [], borderColor: color, borderWidth: 2.5,
        fill: fill !== undefined, backgroundColor: fill || 'transparent',
        pointRadius: 0, tension: 0.4 };
}

function mkChart(id, color, fill) {
    return new Chart($(id), {
        type: 'line',
        data: { labels: [], datasets: [mkDataset(color, fill)] },
        options: mkOpts()
    });
}

function mkChartMulti(id, colors, opts) {
    // colors: array di stringhe colore — un dataset per colore, niente fill (linee sovrapposte)
    return new Chart($(id), {
        type: 'line',
        data: { labels: [], datasets: colors.map(c => mkDataset(c)) },
        options: mkOpts(opts)
    });
}

function setChart(key, labels, data) {
    const c = charts[key];
    c.data.labels = labels;
    c.data.datasets[0].data = data;
    c.update('none');
}

function setChartMulti(key, labels, dataArrays) {
    const c = charts[key];
    c.data.labels = labels;
    dataArrays.forEach((d, i) => { if (c.data.datasets[i]) c.data.datasets[i].data = d; });
    c.update('none');
}

function initCharts() {
    // Home: 3 linee sovrapposte (TFR viola, PAC verde, CD blu), scala lineare con minimo dinamico
    charts.home    = mkChartMulti('home-chart', ['#A78BFA', '#34D399', '#60A5FA'], { dynamicY: true });
    charts.pension = mkChart('pension-chart', '#A78BFA', 'rgba(167,139,250,0.13)');
    charts.pac     = mkChart('pac-chart',     '#34D399', 'rgba(52,211,153,0.13)');
    charts.cd      = mkChart('cd-chart',      '#60A5FA', 'rgba(96,165,250,0.13)');
}
