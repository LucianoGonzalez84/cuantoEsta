(function () {
    "use strict";
 
    let cotizaciones = {
        blue: { compra: 0, venta: 0 },
        oficial: { compra: 0, venta: 0 },
        mep: { compra: 0, venta: 0 },
        ccl: { compra: 0, venta: 0 },
        tarjeta: { compra: 0, venta: 0 },
        cripto: { compra: 0, venta: 0 }
    };
 
    let isUsdToArs = true;
 
    // ========================================
    // CARGAR COTIZACIONES
    // ========================================
    
    async function cargarCotizaciones() {
        const loader = document.getElementById('last-update');
        console.log('🚀 Iniciando carga de cotizaciones...');
        
        try {
            const timestamp = Date.now();
            const response = await fetch(`/api/dolares?_=${timestamp}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) throw new Error('Error HTTP');
            
            const data = await response.json();
            console.log('✅ Datos obtenidos:', data);
 
            cotizaciones = {
                blue: data.blue,
                oficial: data.oficial,
                mep: data.mep,
                ccl: data.ccl,
                tarjeta: data.tarjeta,
                cripto: data.cripto
            };
 
            console.log('✅ Actualizando UI...');
            actualizarUI();
            
            // IMPORTANTE: Actualizar banner DESPUÉS de tener los datos
            await actualizarBanner();
            
            // Timestamp
            if (loader) {
                const ahora = new Date();
                const hora = ahora.toLocaleTimeString('es-AR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                loader.textContent = `${hora} (hace 0 min)`;
                loader.style.display = 'flex';
            }
 
        } catch (error) {
            console.error('❌ Error al cargar cotizaciones:', error);
            if (loader) loader.textContent = 'Error al cargar datos';
        }
    }
 
    // ========================================
    // ACTUALIZAR UI
    // ========================================
    
    function actualizarUI() {
        actualizarCotizacion('blue', cotizaciones.blue);
        actualizarCotizacion('oficial', cotizaciones.oficial);
        actualizarCotizacion('mep', cotizaciones.mep);
        actualizarCotizacion('ccl', cotizaciones.ccl);
        actualizarCotizacion('tarjeta', cotizaciones.tarjeta);
        actualizarCotizacion('cripto', cotizaciones.cripto);
 
        actualizarBrecha();
        actualizarVariaciones();
    }
 
    function actualizarCotizacion(tipo, valores) {
        const ventaElem = document.getElementById(`${tipo}-valor`);
        if (ventaElem && valores.venta) {
            ventaElem.textContent = formatPeso(valores.venta);
        }
 
        const compraElem = document.getElementById(`${tipo}-compra`);
        if (compraElem && valores.compra) {
            compraElem.textContent = formatPeso(valores.compra);
        }
    }
 
    function formatPeso(valor) {
        return '$' + valor.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
 
    // ========================================
    // VARIACIONES
    // ========================================
    
    async function actualizarVariaciones() {
        try {
            const timestamp = Date.now();
            const response = await fetch(`https://raw.githubusercontent.com/LucianoGonzalez84/cuantoEsta/main/historico.json?_=${timestamp}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            const historico = await response.json();
            
            if (!historico.ultimas_cotizaciones || historico.ultimas_cotizaciones.length < 1) return;
 
            const ayer = historico.ultimas_cotizaciones[historico.ultimas_cotizaciones.length - 1];
            const tipos = ['blue', 'oficial', 'mep', 'ccl', 'tarjeta', 'cripto'];
 
            tipos.forEach(tipo => {
                const valorHoy = cotizaciones[tipo]?.venta;
                const valorAyer = ayer[tipo]?.venta;
 
                if (valorHoy && valorAyer) {
                    const variacion = ((valorHoy - valorAyer) / valorAyer * 100);
                    mostrarVariacion(tipo, variacion);
                }
            });
 
        } catch (error) {
            console.error('Error al calcular variaciones:', error);
        }
    }
 
    function mostrarVariacion(tipo, variacion) {
        const elem = document.getElementById(`${tipo}-variacion`);
        if (!elem) return;
 
        const flecha = elem.querySelector('.variacion-flecha');
        const porcentaje = elem.querySelector('.variacion-porcentaje');
 
        if (variacion > 0) {
            flecha.textContent = '▲';
            porcentaje.textContent = `+${variacion.toFixed(2)}% vs ayer`;
            elem.className = 'cotizacion-variacion negativo';
        } else if (variacion < 0) {
            flecha.textContent = '▼';
            porcentaje.textContent = `${variacion.toFixed(2)}% vs ayer`;
            elem.className = 'cotizacion-variacion positivo';
        } else {
            flecha.textContent = '—';
            porcentaje.textContent = '0.00% vs ayer';
            elem.className = 'cotizacion-variacion neutro';
        }
 
        elem.style.display = 'flex';
    }
 
    // ========================================
    // BRECHA CAMBIARIA
    // ========================================
    
    function actualizarBrecha() {
        const brechaElem = document.getElementById('brecha-porcentaje');
        if (!brechaElem) {
            console.warn('❌ Elemento brecha-porcentaje no encontrado');
            return;
        }
 
        const blue = cotizaciones.blue?.venta || 0;
        const oficial = cotizaciones.oficial?.venta || 0;
 
        console.log('📊 Actualizando brecha:', { blue, oficial });
 
        if (blue && oficial && blue > 0 && oficial > 0) {
            const brecha = ((blue - oficial) / oficial * 100);
            brechaElem.textContent = brecha.toFixed(1) + '%';
            console.log('✅ Brecha actualizada:', brecha.toFixed(1) + '%');
        } else {
            console.warn('⚠️ Valores de brecha inválidos:', { blue, oficial });
            brechaElem.textContent = '0%';
        }
    }
 
    // ========================================
    // BANNER INFO RÁPIDA - CORREGIDO
    // ========================================
    
    async function actualizarBanner() {
        console.log('🎨 Actualizando banner...');
        console.log('📊 Cotizaciones disponibles:', cotizaciones);
        
        // ESPERAR UN MOMENTO para asegurar que los datos estén
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // VERIFICAR QUE TENGAMOS DATOS
        const hayDatos = Object.values(cotizaciones).some(c => c.venta > 0);
        if (!hayDatos) {
            console.warn('⚠️ No hay datos de cotizaciones todavía');
            return;
        }
        
        // Filtrar solo cotizaciones con valor > 0
        const valores = Object.entries(cotizaciones)
            .filter(([nombre, datos]) => datos.venta > 0)
            .map(([nombre, datos]) => ({
                nombre,
                venta: datos.venta
            }));
        
        console.log('📊 Valores filtrados:', valores);
        
        if (valores.length === 0) {
            console.warn('⚠️ No hay valores válidos para el banner');
            return;
        }
 
        // MÁS BARATO
        const masBarato = valores.reduce((min, curr) => 
            curr.venta < min.venta ? curr : min
        );
        const elemBarato = document.getElementById('banner-barato');
        if (elemBarato) {
            const texto = `${masBarato.nombre.toUpperCase()} $${masBarato.venta.toFixed(2)}`;
            elemBarato.textContent = texto;
            console.log('✅ Banner barato:', texto);
        } else {
            console.error('❌ Elemento banner-barato no encontrado');
        }
 
        // MÁS CARO
        const masCaro = valores.reduce((max, curr) => 
            curr.venta > max.venta ? curr : max
        );
        const elemCaro = document.getElementById('banner-caro');
        if (elemCaro) {
            const texto = `${masCaro.nombre.toUpperCase()} $${masCaro.venta.toFixed(2)}`;
            elemCaro.textContent = texto;
            console.log('✅ Banner caro:', texto);
        } else {
            console.error('❌ Elemento banner-caro no encontrado');
        }
 
        // MAYOR SUBA Y BAJA (requiere histórico)
        try {
            const timestamp = Date.now();
            const response = await fetch(`https://raw.githubusercontent.com/LucianoGonzalez84/cuantoEsta/main/historico.json?_=${timestamp}`, {
                cache: 'no-store'
            });
            const historico = await response.json();
            
            if (historico.ultimas_cotizaciones && historico.ultimas_cotizaciones.length > 0) {
                const ayer = historico.ultimas_cotizaciones[historico.ultimas_cotizaciones.length - 1];
                
                let mayorSuba = { nombre: '', valor: -Infinity };
                let mayorBaja = { nombre: '', valor: Infinity };
                
                Object.keys(cotizaciones).forEach(tipo => {
                    const hoy = cotizaciones[tipo]?.venta;
                    const ayerVal = ayer[tipo]?.venta;
                    
                    if (hoy && ayerVal && hoy > 0 && ayerVal > 0) {
                        const variacion = ((hoy - ayerVal) / ayerVal * 100);
                        
                        if (variacion > mayorSuba.valor) {
                            mayorSuba = { nombre: tipo, valor: variacion };
                        }
                        if (variacion < mayorBaja.valor) {
                            mayorBaja = { nombre: tipo, valor: variacion };
                        }
                    }
                });
                
                const elemSuba = document.getElementById('banner-suba');
                if (elemSuba && mayorSuba.nombre) {
                    elemSuba.textContent = `${mayorSuba.nombre.toUpperCase()} +${mayorSuba.valor.toFixed(2)}%`;
                }
                
                const elemBaja = document.getElementById('banner-baja');
                if (elemBaja && mayorBaja.nombre) {
                    elemBaja.textContent = `${mayorBaja.nombre.toUpperCase()} ${mayorBaja.valor.toFixed(2)}%`;
                }
            }
        } catch (error) {
            console.error('Error al calcular variaciones del banner:', error);
        }
 
        // BRECHA
        const blue = cotizaciones.blue?.venta || 0;
        const oficial = cotizaciones.oficial?.venta || 0;
        
        if (blue > 0 && oficial > 0) {
            const brecha = ((blue - oficial) / oficial * 100);
            const elemBrecha = document.getElementById('banner-brecha');
            if (elemBrecha) {
                elemBrecha.textContent = `${brecha.toFixed(1)}%`;
                console.log('✅ Banner brecha:', brecha.toFixed(1) + '%');
            }
        }
        
        console.log('✅ Banner actualizado completamente');
    }
 
    // ========================================
    // CONVERSOR - CORREGIDO
    // ========================================
    
    function initConversor() {
        const inputFrom = document.getElementById('input-from');
        const cotizacionSelect = document.getElementById('cotizacion-select');
        const swapBtn = document.getElementById('swap-btn');
        const resultValue = document.getElementById('conversion-value');
        const labelFrom = document.getElementById('label-from');
        const symbolFrom = document.getElementById('symbol-from');
 
        if (!inputFrom || !cotizacionSelect || !resultValue) {
            console.warn('⚠️ Elementos del conversor no encontrados');
            return;
        }
 
        function convertir() {
            const monto = parseFloat(inputFrom.value) || 0;
            const tipoCotizacion = cotizacionSelect.value;
            const cotizacion = cotizaciones[tipoCotizacion]?.venta || 0;
 
            console.log('🔄 Convirtiendo:', { monto, tipo: tipoCotizacion, cotizacion, isUsdToArs });
 
            if (cotizacion === 0) {
                resultValue.textContent = '$ 0';
                console.warn('⚠️ Cotización es 0');
                return;
            }
 
            let resultado;
            if (isUsdToArs) {
                // USD → ARS
                resultado = monto * cotizacion;
                resultValue.textContent = formatPeso(resultado);
            } else {
                // ARS → USD
                resultado = monto / cotizacion;
                resultValue.textContent = `USD ${resultado.toFixed(2)}`;
            }
            
            console.log('✅ Resultado:', resultValue.textContent);
        }
 
        // Event listeners
        inputFrom.addEventListener('input', convertir);
        cotizacionSelect.addEventListener('change', convertir);
        
        if (swapBtn) {
            swapBtn.addEventListener('click', () => {
                isUsdToArs = !isUsdToArs;
                
                if (labelFrom) {
                    labelFrom.textContent = isUsdToArs ? 'USD Dólares' : 'ARS Pesos';
                }
                if (symbolFrom) {
                    symbolFrom.textContent = isUsdToArs ? '$' : '$';
                }
                
                console.log('🔄 Swap:', isUsdToArs ? 'USD → ARS' : 'ARS → USD');
                convertir();
            });
        }
        
        // Convertir inicial
        setTimeout(convertir, 500);
    }
 
    // ========================================
    // CARRUSEL BANNER (Mobile)
    // ========================================
    
    let bannerSlide = 0;
    let bannerInterval;
 
    function initBannerCarousel() {
        const track = document.querySelector('.banner-track');
        const items = document.querySelectorAll('.banner-item');
        const dots = document.querySelectorAll('.banner-dots .dot');
        const bannerTotal = items.length;
 
        if (!track || items.length === 0) {
            console.warn('⚠️ Elementos del carrusel no encontrados');
            return;
        }
        
        if (bannerInterval) clearInterval(bannerInterval);
 
        function goToSlide(index) {
            bannerSlide = index;
            const offset = -index * 100;
            track.style.transform = `translateX(${offset}%)`;
            
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        }
 
        // Dots click
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                if (bannerInterval) clearInterval(bannerInterval);
                goToSlide(index);
                bannerInterval = setInterval(() => {
                    goToSlide((bannerSlide + 1) % bannerTotal);
                }, 3000);
            });
        });
 
        // Swipe
        let touchStartX = 0;
        track.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].screenX;
            if (bannerInterval) clearInterval(bannerInterval);
        }, { passive: true });
 
        track.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0 && bannerSlide < bannerTotal - 1) {
                    goToSlide(bannerSlide + 1);
                } else if (diff < 0 && bannerSlide > 0) {
                    goToSlide(bannerSlide - 1);
                }
            }
            
            bannerInterval = setInterval(() => {
                goToSlide((bannerSlide + 1) % bannerTotal);
            }, 3000);
        }, { passive: true });
 
        // Autoplay
        goToSlide(0);
        bannerInterval = setInterval(() => {
            goToSlide((bannerSlide + 1) % bannerTotal);
        }, 3000);
        
        console.log('✅ Carrusel inicializado');
    }
 
    // ========================================
    // INICIALIZACIÓN
    // ========================================
    
    console.log('🚀 Iniciando aplicación...');
    
    // Cargar datos inmediatamente
    cargarCotizaciones();
 
    // Actualizar cada 5 minutos
    setInterval(cargarCotizaciones, 5 * 60 * 1000);
 
    // Iniciar conversor cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initConversor);
    } else {
        initConversor();
    }
 
    // Iniciar carrusel
    setTimeout(initBannerCarousel, 500);
    window.addEventListener('resize', () => setTimeout(initBannerCarousel, 250));
 
})();
