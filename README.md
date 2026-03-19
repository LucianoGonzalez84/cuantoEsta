# 💵 CuantoEsta.ar

> Cotización del dólar en Argentina en tiempo real. Simple, rápido y sin humo.

[![Security Headers](https://img.shields.io/badge/Security-Grade%20A-brightgreen)](https://securityheaders.com)
[![Accessibility](https://img.shields.io/badge/Accessibility-9%2F10%20WCAG%202.1%20AA-blue)](https://www.w3.org/WAI/WCAG21/quickref/)
[![Performance](https://img.shields.io/badge/Performance-%3C1s%20load-success)](https://cuantoesta.ar)

## 🌟 Features

- ⚡ **Ultra rápido** - Carga en menos de 1 segundo
- 📊 **6 cotizaciones** - Blue, Oficial, MEP, CCL, Tarjeta, Cripto
- 🔄 **Conversor** - USD ⇄ ARS en tiempo real
- 📈 **Gráficos históricos** - 7 días de tendencias
- 📱 **Mobile-first** - Diseñado para celulares
- ♿ **Accesible** - WCAG 2.1 AA (9/10)
- 🔒 **Seguro** - Grade A en SecurityHeaders
- 🤖 **100% automático** - Sin mantenimiento

## 🎯 ¿Por qué otro sitio de dólar?

La competencia tiene problemas:

| Problema | Cronista/Ámbito | CuantoEsta |
|----------|----------------|------------|
| Velocidad de carga | 3-5 segundos | **< 1 segundo** ✅ |
| Cotizaciones | 50+ (abrumador) | 6 (las que importan) ✅ |
| Mobile | Desktop-first | **Mobile-first** ✅ |
| Paywall | $800/mes | **Gratis** ✅ |
| Datos | Scraping manual | **API automática** ✅ |
| Accesibilidad | Baja | **9/10 WCAG** ✅ |

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Charts:** Chart.js
- **API:** [DolarApi.com](https://dolarapi.com)
- **Histórico:** GitHub Actions (cron diario)
- **Deploy:** Vercel (Edge Network)
- **Analytics:** Google Analytics 4
- **Seguridad:** CSP, HSTS, X-Frame-Options

## 📊 Arquitectura

```
┌─────────────────┐
│  DolarApi.com   │  ← API pública de cotizaciones
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   index.html    │  ← Frontend estático (JAMstack)
│   + Chart.js    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Action   │  ← Cron job diario (20:00 hs)
│ (guardar datos) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ historico.json  │  ← Últimos 7 días
└─────────────────┘
```

## 🚀 Deploy

El sitio se deploya automáticamente en Vercel cuando se hace push a `main`.

```bash
# Clonar repo
git clone https://github.com/LucianoGonzalez84/cuantoEsta.git

# El sitio es estático, podés abrirlo directamente
# O levantar un servidor local:
python -m http.server 8000
```

## 📈 Roadmap

- [x] Cotizaciones en tiempo real
- [x] Conversor USD/ARS
- [x] Gráficos históricos
- [x] Variaciones diarias
- [x] Mini sparklines
- [x] Seguridad Grade A
- [x] Accesibilidad 9/10
- [ ] Alertas por email/Telegram
- [ ] API pública
- [ ] Widget embebible
- [ ] App mobile (PWA)

## 📊 Métricas

- **Velocidad:** < 1 segundo
- **Seguridad:** Grade A (SecurityHeaders)
- **Accesibilidad:** 9/10 (WCAG 2.1 AA)
- **SEO:** Optimizado (meta tags, sitemap, robots.txt)
- **Uptime:** 99.9% (Vercel SLA)

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repo
2. Crear una rama (`git checkout -b feature/AmazingFeature`)
3. Commit los cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto es open source y está disponible bajo la [MIT License](LICENSE).

## 💰 Soporte

Si te gusta el proyecto y querés apoyarlo:

- ⭐ Dale una estrella en GitHub
- 🐦 Compartilo en redes
- 🐛 Reportá bugs
- 💡 Sugerí features

## 🙏 Créditos

- **API:** [DolarApi.com](https://dolarapi.com) por los datos
- **Charts:** [Chart.js](https://www.chartjs.org/)
- **Hosting:** [Vercel](https://vercel.com)
- **Fonts:** [Google Fonts](https://fonts.google.com) (Sora + Work Sans)

## 📧 Contacto

Creado por **Luciano Gonzalez**

- GitHub: [@LucianoGonzalez84](https://github.com/LucianoGonzalez84)
- Sitio: [cuantoesta.ar](https://cuantoesta.ar)

---

**⚡ Hecho con ❤️ en Argentina 🇦🇷**
