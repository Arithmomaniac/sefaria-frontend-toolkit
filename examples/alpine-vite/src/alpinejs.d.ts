declare module "alpinejs" {
  interface Alpine {
    data(name: string, provider: () => object): void;
    start(): void;
    initTree(element: Element): void;
    destroyTree(element: Element): void;
  }

  const Alpine: Alpine;
  export default Alpine;
}
