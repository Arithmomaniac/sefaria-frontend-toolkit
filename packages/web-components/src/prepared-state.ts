import { nothing } from "lit";
import { Directive, directive, type ElementPart } from "lit/directive.js";

const preparedStates = new WeakMap<object, unknown>();
const preparedStatuses = new WeakMap<
  object,
  "empty" | "loading" | "ready" | "error"
>();

interface PreparedStateHost {
  requestUpdate(): void;
}

/** Reads package-private prepared state for one component instance. */
export function getPreparedState<T>(target: object): T | undefined {
  return preparedStates.get(target) as T | undefined;
}

/** Replaces package-private prepared state and schedules rendering. */
export function setPreparedState<T>(
  target: object & PreparedStateHost,
  state: T | undefined,
): void {
  if (Object.is(preparedStates.get(target), state)) return;
  if (state === undefined) {
    preparedStates.delete(target);
  } else {
    preparedStates.set(target, state);
  }
  target.requestUpdate();
}

/** Reads the package-private coarse status for one component instance. */
export function getPreparedStatus(
  target: object,
): "empty" | "loading" | "ready" | "error" | undefined {
  return preparedStatuses.get(target);
}

/** Replaces the package-private coarse status and schedules rendering. */
export function setPreparedStatus(
  target: object & PreparedStateHost,
  status: "empty" | "loading" | "ready" | "error" | undefined,
): void {
  if (preparedStatuses.get(target) === status) return;
  if (status === undefined) {
    preparedStatuses.delete(target);
  } else {
    preparedStatuses.set(target, status);
  }
  target.requestUpdate();
}

class PreparedStateDirective extends Directive {
  render(_state: unknown) {
    return nothing;
  }

  override update(part: Parameters<Directive["update"]>[0], props: unknown[]) {
    const element = (part as ElementPart).element as HTMLElement &
      PreparedStateHost;
    setPreparedState(element, props[0]);
    return nothing;
  }
}

/** Supplies package-private prepared state to a composed child element. */
export const prepared = directive(PreparedStateDirective);
