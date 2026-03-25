export default async function handler(req, res) {
    try {
        const endpoints = {
            blue: 'https://dolarapi.com/v1/dolares/blue',
            oficial: 'https://dolarapi.com/v1/dolares/oficial',
            mep: 'https://dolarapi.com/v1/dolares/bolsa',
            ccl: 'https://dolarapi.com/v1/dolares/contadoconliqui',
            tarjeta: 'https://dolarapi.com/v1/dolares/tarjeta',
            cripto: 'https://dolarapi.com/v1/dolares/cripto'
        };

        const responses = await Promise.all(
            Object.entries(endpoints).map(async ([key, url]) => {
                const r = await fetch(url);
                const data = await r.json();
                return [key, data];
            })
        );

        const data = Object.fromEntries(responses);

        const fechas = Object.values(data)
    .map(d => d.fechaActualizacion)
    .filter(Boolean);

const fecha = fechas.length
    ? fechas.sort().reverse()[0]
    : new Date().toISOString();

        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

        res.status(200).json({
            fecha,
            ...data
        });

    } catch {
        res.status(500).json({ error: 'Error' });
    }
}
