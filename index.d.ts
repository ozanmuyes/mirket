declare namespace Mirket {
  export function bind2(alias: String, fn: Function, isConstructor: Boolean): void;
  //
}

declare function MirketCtor(optics: Object): Mirket;

export = MirketCtor;
