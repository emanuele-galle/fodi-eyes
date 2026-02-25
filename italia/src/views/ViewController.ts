export interface ViewController {
  activate(): void;
  deactivate(): void;
  destroy(): void;
  getElement(): HTMLElement;
}
