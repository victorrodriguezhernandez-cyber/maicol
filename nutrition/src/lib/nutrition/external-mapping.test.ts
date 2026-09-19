import { describe, it, expect } from "vitest";
import { productoOffAAlimento, alimentoUsdaAAlimento } from "./external-mapping";
import productoOff from "./__fixtures__/off-cereal-mix.json";
import alimentoUsda from "./__fixtures__/usda-pechuga-pollo.json";

/**
 * Los dos fixtures son respuestas REALES, capturadas de las APIs, no
 * objetos escritos por mí. Es la diferencia entre comprobar que el
 * código lee bien lo que la fuente manda y comprobar que mi idea de la
 * fuente coincide conmigo mismo (regla 11).
 *
 * - `off-cereal-mix.json`: producto 77916501 de Open Food Facts.
 * - `usda-pechuga-pollo.json`: fdcId 171077, pechuga de pollo cruda,
 *   con sus 129 nutrientes tal cual vienen.
 */

describe("Open Food Facts → alimento", () => {
  const alimento = productoOffAAlimento(productoOff as Record<string, unknown>)!;

  it("lee los macros tal y como los publica la fuente", () => {
    expect(alimento.nombre).toBe("Cereal Mix Original");
    expect(alimento.marca).toBe("Arcor");
    expect(alimento.codigoBarras).toBe("77916501");
    expect(alimento.energyKcal).toBe(402);
    expect(alimento.proteinG).toBe(6.5);
    expect(alimento.carbohydratesG).toBe(66);
    expect(alimento.fatG).toBe(13);
  });

  /** EL ERROR DE MIL VECES. La fuente dice 0,159 g; la app guarda mg. */
  it("convierte el sodio de gramos a miligramos", () => {
    expect(alimento.sodiumMg).toBeCloseTo(159, 6);
    // La sal sí va en gramos en las dos, así que no se toca.
    expect(alimento.saltG).toBe(0.3975);
  });

  it("trae el panel que enseñan las apps grandes", () => {
    expect(alimento.sugarsG).toBe(27);
    expect(alimento.saturatedFatG).toBe(1.6);
    expect(alimento.fiberG).toBe(3.3);
    expect(alimento.micronutrients).toMatchObject({
      added_sugars_g: 27,
      trans_fat_g: 0,
      cholesterol_mg: 0,
      monounsaturated_fat_g: 9.5,
      polyunsaturated_fat_g: 1.3,
    });
  });

  it("no inventa lo que el producto no declara", () => {
    // Este producto no trae potasio ni vitaminas: no aparecen, y sobre
    // todo no aparecen como 0, que sería afirmar que no tiene.
    expect("potassium_mg" in alimento.micronutrients).toBe(false);
    expect("vitamin_c_mg" in alimento.micronutrients).toBe(false);
  });

  it("coge la ración cuando la fuente la da", () => {
    expect(alimento.servingSizeG).toBe(23);
    expect(alimento.servingLabel).toBe("1 barra/bar (23 g)");
  });

  it("descarta un producto sin nombre o sin calorías", () => {
    expect(productoOffAAlimento({ code: "1", nutriments: { "energy-kcal_100g": 100 } })).toBeNull();
    expect(productoOffAAlimento({ code: "1", product_name: "Algo", nutriments: {} })).toBeNull();
  });
});

describe("USDA → alimento", () => {
  const alimento = alimentoUsdaAAlimento(alimentoUsda as unknown as Record<string, unknown>)!;

  it("empareja los nutrientes por su número, no por su nombre", () => {
    // El nombre en texto cambia entre conjuntos de datos de USDA
    // ("Energy" vs "Energy (Atwater General Factors)"); el número no.
    expect(alimento.nombre).toBe(
      "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw",
    );
    expect(alimento.idExterno).toBe("171077");
    expect(alimento.energyKcal).toBe(120);
    expect(alimento.proteinG).toBe(22.5);
    expect(alimento.carbohydratesG).toBe(0);
    expect(alimento.fatG).toBe(2.62);
    expect(alimento.saturatedFatG).toBe(0.563);
    expect(alimento.sodiumMg).toBe(45);
  });

  it("saca los micros de entre los 129 nutrientes que devuelve", () => {
    expect(alimento.micronutrients).toMatchObject({
      cholesterol_mg: 73,
      potassium_mg: 334,
      calcium_mg: 5,
      iron_mg: 0.37,
    });
  });

  it("deja vacía la sal, que USDA no publica", () => {
    // Calcularla desde el sodio (×2,5) sería aplicar una conversión de
    // manual a un dato que la fuente no ha afirmado.
    expect(alimento.saltG).toBeNull();
  });

  it("descarta un nutriente cuya unidad no es la esperada", () => {
    const manipulado = {
      ...(alimentoUsda as unknown as Record<string, unknown>),
      foodNutrients: [
        { nutrientId: 1008, value: 120, unitName: "KCAL" },
        { nutrientId: 1003, value: 22.5, unitName: "G" },
        { nutrientId: 1005, value: 0, unitName: "G" },
        { nutrientId: 1004, value: 2.62, unitName: "G" },
        // Sodio en una unidad que no tocaba: fuera, antes que colarlo mal.
        { nutrientId: 1093, value: 45, unitName: "G" },
      ],
    };
    expect(alimentoUsdaAAlimento(manipulado)!.sodiumMg).toBeNull();
  });
});
