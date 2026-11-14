import { describe, expect, it } from "vitest";
import { esServicioDePush } from "./push";

describe("destino de los avisos", () => {
  it("acepta los servicios de notificaciones de Chrome, Safari, Firefox y Edge", () => {
    expect(esServicioDePush("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(esServicioDePush("https://web.push.apple.com/QGk")).toBe(true);
    expect(esServicioDePush("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(esServicioDePush("https://wns2-by3p.notify.windows.com/w/?token=x")).toBe(true);
  });

  it("rechaza cualquier otra dirección", () => {
    expect(esServicioDePush("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(esServicioDePush("https://fcm.googleapis.com.malo.test/x")).toBe(false);
    expect(esServicioDePush("https://malo.test/fcm.googleapis.com")).toBe(false);
    expect(esServicioDePush("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(esServicioDePush("https://localhost/x")).toBe(false);
    expect(esServicioDePush("https://usuario@fcm.googleapis.com/x")).toBe(false);
    expect(esServicioDePush("https://fcm.googleapis.com:8443/x")).toBe(false);
    expect(esServicioDePush("no es una dirección")).toBe(false);
  });
});
