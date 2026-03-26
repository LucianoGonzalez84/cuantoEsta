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

        // Fetch todos los endpoints en paralelo
        const responses = await Promise.all(
            Object.entries(endpoints).map(async ([key, url]) => {
                try {
                    const r = await fetch(url);
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    const data = await r.json();
                    return [key, data];
                } catch (error) {
                    console.error(`Error fetching ${key}:`, error);
                    // Fallback si falla
                    return [key, { compra: 0, venta: 0, fechaActualizacion: null }];
                }
            })
        );

        const data = Object.fromEntries(responses);

        // Fecha más reciente
        const fechas = Object.values(data)
            .map(d => d?.fechaActualizacion)
            .filter(Boolean);

        const fecha = fechas.length
            ? fechas.sort().reverse()[0]
            : new Date().toISOString();

        // Resultado (SIN variaciones - el frontend las calcula desde GitHub)
        const resultado = {
            fecha,
            blue: data.blue,
            oficial: data.oficial,
            mep: data.mep,
            ccl: data.ccl,
            tarjeta: data.tarjeta,
            cripto: data.cripto
        };

        // Cache CDN de 5 minutos
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        
        // CORS headers (por si acaso)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');

        res.status(200).json(resultado);

    } catch (error) {
        console.error('Error en /api/dolares:', error);
        res.status(500).json({ 
            error: 'Error obteniendo cotizaciones',
            message: error.message 
        });
    }
}

