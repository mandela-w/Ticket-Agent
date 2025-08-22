declare module "playwright" {
  interface Page {
    evaluate<R>(pageFunction: () => R | Promise<R>): Promise<R>;
    evaluate<Arg, R>(
      pageFunction: (arg: Arg) => R | Promise<R>,
      arg: Arg
    ): Promise<R>;
  }
}

export {};
