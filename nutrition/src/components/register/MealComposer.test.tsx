// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MealComposer, type DraftItem } from "./MealComposer";

// El compositor es un componente de cliente que llama a una Server Action
// y empuja una ruta. Ninguna de las dos cosas existe en jsdom, y ninguna
// hace falta para lo que se prueba aquí: cómo se edita una cantidad.
vi.mock("@/lib/actions/meals", () => ({ createMeal: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(cleanup);

function leche(): DraftItem {
  // Un vaso de leche como lo estima la IA: 200 ml, 122 kcal.
  return {
    key: "leche",
    name: "Leche entera",
    quantityAmount: 200,
    quantityUnit: "ml",
    gramsEquivalent: 200,
    energyKcal: 122,
    proteinG: 6.6,
    carbohydratesG: 9.6,
    fatG: 6.6,
    source: "ai_text_estimation",
    precisionLevel: "estimated",
    confidence: "medium",
  };
}

const cantidad = () => screen.getByLabelText("Cantidad en ml") as HTMLInputElement;
// Hay dos cifras en kcal en pantalla: la del alimento y la del total de
// la comida. Con un solo alimento valen lo mismo, pero la que se mira
// aquí es la del alimento, que es la que reescala el campo.
const kcal = () => screen.getAllByText(/kcal$/)[0].textContent;

describe("MealComposer: editar la cantidad de un ingrediente", () => {
  /**
   * EL FALLO QUE MOTIVÓ ESTO.
   *
   * Borrar el número era el camino natural para cambiarlo, y dejaba el
   * campo clavado: llegaba un 0, el 0 ponía todos los macros a cero y
   * además hacía imposible volver a escalar (el reescalado dividía por
   * la cantidad anterior, que ya era 0). A partir de ahí no se podía
   * teclear nada.
   */
  it("deja borrar el número y escribir otro", () => {
    render(<MealComposer initialItems={[leche()]} />);

    fireEvent.change(cantidad(), { target: { value: "" } });
    expect(cantidad().value).toBe("");
    // Vaciar el campo no toca el alimento: las calorías siguen ahí.
    expect(kcal()).toBe("122 kcal");

    fireEvent.change(cantidad(), { target: { value: "300" } });
    expect(cantidad().value).toBe("300");
    expect(kcal()).toBe("183 kcal"); // 122 × 300/200
  });

  it("acepta la coma decimal del teclado español", () => {
    render(<MealComposer initialItems={[leche()]} />);

    fireEvent.change(cantidad(), { target: { value: "100,5" } });
    expect(cantidad().value).toBe("100,5");
    expect(kcal()).toBe("61 kcal"); // 122 × 100,5/200 = 61,305
  });

  it("al salir del campo vacío vuelve el último número bueno", () => {
    render(<MealComposer initialItems={[leche()]} />);

    fireEvent.change(cantidad(), { target: { value: "150" } });
    fireEvent.change(cantidad(), { target: { value: "" } });
    fireEvent.blur(cantidad());

    expect(cantidad().value).toBe("150");
    expect(kcal()).toBe("92 kcal"); // 122 × 150/200 = 91,5
  });

  /**
   * El reescalado parte siempre de los valores con los que el alimento
   * entró, no de los de la edición anterior.
   *
   * Lo que fija este test es el viaje de ida y vuelta: pases por donde
   * pases, volver a la cantidad de partida tiene que devolver la cifra
   * de partida. (El error de coma flotante que también arregla la base
   * es de 1e-14 y la pantalla redondea a kcal enteras, así que ESO no se
   * puede comprobar desde aquí — se arregla porque es lo correcto, no
   * porque se viera.)
   */
  it("volver a la cantidad de partida devuelve los valores de partida", () => {
    render(<MealComposer initialItems={[leche()]} />);

    fireEvent.change(cantidad(), { target: { value: "60" } });
    fireEvent.change(cantidad(), { target: { value: "17" } });
    fireEvent.change(cantidad(), { target: { value: "" } });
    fireEvent.change(cantidad(), { target: { value: "200" } });

    expect(kcal()).toBe("122 kcal");
    expect(cantidad().value).toBe("200");
  });
});
