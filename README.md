# iMac Fan Dashboard

A small, local-only dashboard for monitoring temperatures and fan speeds on supported Intel iMacs running Linux. It can switch the existing `smart-fan.service` between quiet-smart and boost-smart modes.

> **Hardware note:** This project depends on the Apple System Management Controller (`applesmc`) Linux driver and the three-fan sysfs layout at `/sys/devices/platform/applesmc.768`. It is not a generic fan controller for every computer or iMac generation. Confirm that your system exposes these files before installing.

## Features

- Arabic right-to-left dashboard with live temperature, three fan RPM readings, service state, and a short in-page temperature trace.
- Local HTTP server bound only to `127.0.0.1`; no third-party Python packages.
- Explicit quiet and boost controls. Mode changes go through `pkexec`; the web server itself runs as the logged-in user.
- Existing systemd fan controller remains responsible for thermal control. Missing sensor readings trigger its full-speed failsafe.
- Timestamped backup of existing fan scripts and the service unit during installation.

## Requirements

- Linux with Python 3, systemd, `lm-sensors` (`sensors` command), `pkexec`, and a working PolicyKit authentication agent.
- A supported Intel iMac with the AppleSMC fan sysfs files described above.
- Root access for installation. Run the dashboard itself as a normal user.

## Install

```sh
sudo ./install.sh
```

The installer places the runtime in `/opt/fan-dashboard`, installs the `smart-fan.service` unit and compatibility commands, creates a backup under `/var/backups/`, enables the service, and restarts it.

## Run

```sh
fan-dashboard
```

The local dashboard opens in your browser. Press `Ctrl+C` in the terminal to stop the web server. A different port can be selected with `fan-dashboard --port 8766`.

The legacy `fan-toggle.sh` command toggles between quiet and boost without opening the dashboard.

## Uninstall

Stop and disable the service with `sudo systemctl disable --now smart-fan.service`, then remove `/opt/fan-dashboard`, `/usr/local/bin/fan-dashboard`, `/usr/local/bin/fan-toggle.sh`, `/usr/local/bin/smart-fan.sh`, and `/etc/systemd/system/smart-fan.service`. Run `sudo systemctl daemon-reload`. Restore any prior system files from the timestamped backup if needed.

## License

MIT. See [LICENSE](LICENSE).

---

# لوحة مراوح iMac

لوحة محلية لمراقبة الحرارة وسرعات المراوح على أجهزة iMac المدعومة التي تعمل بلينكس، وتغيير خدمة `smart-fan.service` بين الوضع الهادئ الذكي والتبريد القوي.

> **ملاحظة توافق:** تعتمد الأداة على تعريف AppleSMC في لينكس ومسارات المراوح الثلاثة تحت `/sys/devices/platform/applesmc.768`. لا تعمل كأداة عامة لكل الحواسيب أو كل أجيال iMac؛ تحقق من وجود ملفات sysfs قبل التثبيت.

### المتطلبات والتشغيل

تحتاج Python 3 وsystemd وحزمة `lm-sensors` و`pkexec` ومكوّن مصادقة PolicyKit، بالإضافة إلى جهاز مدعوم. ثبّت من مجلد المشروع:

```sh
sudo ./install.sh
```

ثم شغّل اللوحة كمستخدم عادي:

```sh
fan-dashboard
```

تعمل اللوحة على الجهاز المحلي فقط، ولا تحتاج مكتبات Python خارجية. خادم الويب يعمل كمستخدم عادي؛ تغيير الوضع يطلب موافقة النظام. خدمة systemd هي المسؤولة عن ضبط سرعات المراوح، وتُنشأ نسخة احتياطية مؤرخة عند التثبيت.
