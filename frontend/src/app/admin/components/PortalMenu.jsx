import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 4;
const EDGE = 8;

/**
 * Row actions dropdown for admin tables.
 *
 * Tables sit inside `overflow-hidden` / `overflow-x-auto` cards, which clip an
 * absolutely-positioned menu (only the first one or two items were visible).
 * This renders the menu into <body> with fixed positioning instead, anchored
 * to the element rendered just before it (the "⋮" button):
 *   - right-aligned under the button, clamped to the viewport
 *   - flips above the button when there isn't room below
 *   - follows the button while the page or table scrolls
 *
 * Drop-in usage, right after the toggle button:
 *   {open && <PortalMenu className="w-40 bg-white ...">...</PortalMenu>}
 *
 * React events still bubble through the portal to the page, so the existing
 * "click anywhere closes the menu" handlers keep working.
 */
const PortalMenu = ({ className = '', children }) => {
    const anchorRef = useRef(null);
    const menuRef = useRef(null);
    const [pos, setPos] = useState(null);

    useLayoutEffect(() => {
        const place = () => {
            const anchor = anchorRef.current;
            const menu = menuRef.current;
            if (!anchor || !menu) return;
            const target = anchor.previousElementSibling || anchor.parentElement;
            const r = target.getBoundingClientRect();
            const mw = menu.offsetWidth;
            const mh = menu.offsetHeight;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            const left = Math.min(Math.max(EDGE, r.right - mw), vw - mw - EDGE);
            let top = r.bottom + GAP;
            if (top + mh > vh - EDGE && r.top - GAP - mh >= EDGE) {
                top = r.top - GAP - mh; // open upwards
            }
            setPos({ top, left });
        };

        place();
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, []);

    return (
        <>
            <span ref={anchorRef} aria-hidden="true" style={{ display: 'none' }} />
            {createPortal(
                <div
                    ref={menuRef}
                    role="menu"
                    style={{
                        position: 'fixed',
                        zIndex: 1000,
                        top: pos?.top ?? 0,
                        left: pos?.left ?? 0,
                        visibility: pos ? 'visible' : 'hidden'
                    }}
                    className={className}
                >
                    {children}
                </div>,
                document.body
            )}
        </>
    );
};

export default PortalMenu;
