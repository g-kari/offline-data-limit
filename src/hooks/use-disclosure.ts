import { useState } from "react";

/** 開閉状態を管理する汎用フック */
export function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);
  const toggle = () => setIsOpen((v) => !v);
  return { isOpen, toggle };
}
