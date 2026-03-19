// Script para guardar cotizaciones diarias en historico.json
// Ejecutado automáticamente por GitHub Actions

const fs = require('fs');
const https = require('https');

// Función para hacer request HTTPS
function fetchData(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function guardarCotizaciones() {
    try {
        console.log('🔄 Obteniendo cotizaciones actuales...');
        
        // Fetch cotizaciones desde DolarApi
        const [blue, oficial, mep, ccl, tarjeta, cripto] = await Promise.all([
            fetchData('https://dolarapi.com/v1/dolares/blue'),
            fetchData('https://dolarapi.com/v1/dolares/oficial'),
            fetchData('https://dolarapi.com/v1/dolares/bolsa'),
            fetchData('https://dolarapi.com/v1/dolares/contadoconliqui'),
            fetchData('https://dolarapi.com/v1/dolares/tarjeta'),
            fetchData('https://dolarapi.com/v1/dolares/cripto')
        ]);

        // Leer histórico actual
        let historico = { ultimas_cotizaciones: [] };
        if (fs.existsSync('historico.json')) {
            const contenido = fs.readFileSync('historico.json', 'utf8');
            historico = JSON.parse(contenido);
        }

        // Crear registro del día con timestamp
        const ahora = new Date();
        const fechaISO = ahora.toISOString();
        
        const registroHoy = {
            fecha: fechaISO,
            timestamp: ahora.getTime(),
            blue: {
                compra: parseFloat(blue.compra),
                venta: parseFloat(blue.venta)
            },
            oficial: {
                compra: parseFloat(oficial.compra),
                venta: parseFloat(oficial.venta)
            },
            mep: {
                compra: parseFloat(mep.compra),
                venta: parseFloat(mep.venta)
            },
            ccl: {
                compra: parseFloat(ccl.compra),
                venta: parseFloat(ccl.venta)
            },
            tarjeta: {
                compra: parseFloat(tarjeta.compra),
                venta: parseFloat(tarjeta.venta)
            },
            cripto: {
                compra: parseFloat(cripto.compra),
                venta: parseFloat(cripto.venta)
            }
        };

        console.log('📊 Cotizaciones obtenidas:');
        console.log(`   Blue: $${registroHoy.blue.venta}`);
        console.log(`   Oficial: $${registroHoy.oficial.venta}`);
        console.log(`   MEP: $${registroHoy.mep.venta}`);
        console.log(`   CCL: $${registroHoy.ccl.venta}`);

        // Evitar duplicados del mismo día
        const hoyStr = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
        historico.ultimas_cotizaciones = historico.ultimas_cotizaciones.filter(registro => {
            const fechaRegistro = new Date(registro.fecha).toISOString().split('T')[0];
            return fechaRegistro !== hoyStr;
        });

        // Agregar registro de hoy
        historico.ultimas_cotizaciones.push(registroHoy);

        // Mantener solo últimos 7 días
        historico.ultimas_cotizaciones = historico.ultimas_cotizaciones
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 7)
            .reverse(); // Orden cronológico (más viejo primero)

        // Guardar archivo
        fs.writeFileSync('historico.json', JSON.stringify(historico, null, 2), 'utf8');
        
        console.log(`✅ Histórico actualizado: ${historico.ultimas_cotizaciones.length} días guardados`);
        console.log(`📅 Rango: ${new Date(historico.ultimas_cotizaciones[0].fecha).toLocaleDateString('es-AR')} → ${new Date(historico.ultimas_cotizaciones[historico.ultimas_cotizaciones.length - 1].fecha).toLocaleDateString('es-AR')}`);
        
    } catch (error) {
        console.error('❌ Error al guardar cotizaciones:', error.message);
        process.exit(1);
    }
}

// Ejecutar
guardarCotizaciones();
