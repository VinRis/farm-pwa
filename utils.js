export const formatters = {
    date: (isoStr) => new Date(isoStr).toLocaleDateString(),
    currency: (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num),
    capitalize: (s) => s.charAt(0).toUpperCase() + s.slice(1)
};

export const uuid = () => crypto.randomUUID();

export const exportCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const getMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    return { start, end };
};
