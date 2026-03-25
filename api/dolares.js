let cacheAnterior = null;

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

        // 🕒 Fecha más reciente
        const fechas = Object.values(data)
            .map(d => d?.fechaActualizacion)
            .filter(Boolean);

        const fecha = fechas.length
            ? fechas.sort().reverse()[0]
            : new Date().toISOString();

        // 🧠 Resultado base
        let resultado = {
            fecha,
            ...data
        };

        // 🔥 Calcular variaciones
        if (cacheAnterior) {
            Object.keys(data).forEach(key => {
                const actual = data[key]?.venta;
                const anterior = cacheAnterior[key]?.venta;

                if (actual && anterior) {
                    const variacion = ((actual - anterior) / anterior * 100);
                    resultado[key].variacion = variacion;
                } else {
                    resultado[key].variacion = 0;
                }
            });
        } else {
            Object.keys(data).forEach(key => {
                resultado[key].variacion = 0;
            });
        }

        // 💾 Guardar estado para próxima ejecución
        cacheAnterior = JSON.parse(JSON.stringify(data));

        // 🚀 Cache CDN
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

        res.status(200).json(resultado);

    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo cotizaciones' });
    }
}
