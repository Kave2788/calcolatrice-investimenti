const charts = {};

function mkOpts() {
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
            y: {
                ticks: {
                    color: 'rgba(255,255,255,0.32)', font: { size: 9 }, maxTicksLimit: 4,
                    callback: v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1000 ? Math.round(v/1000)+'k' : v
                },
                grid:  { color: 'rgba(255,255,255,0.04)' },
                border: { display: false }
            }
        }
    };
}

function mkChart(id, color, fill) {
    return new Chart($(id), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{ data: [], borderColor: color, borderWidth: 2.5,
                fill: true, backgroundColor: fill, pointRadius: 0, tension: 0.4 }]
        },
        options: mkOpts()
    });
}

function setChart(key, labels, data) {
    const c = charts[key];
    c.data.labels = labels;
    c.data.datasets[0].data = data;
    c.update('none');
}

function initCharts() {
    charts.home    = mkChart('home-chart',    '#F59E0B', 'rgba(245,158,11,0.13)');
    charts.pension = mkChart('pension-chart', '#A78BFA', 'rgba(167,139,250,0.13)');
    charts.pac     = mkChart('pac-chart',     '#34D399', 'rgba(52,211,153,0.13)');
    charts.cd      = mkChart('cd-chart',      '#60A5FA', 'rgba(96,165,250,0.13)');
}
