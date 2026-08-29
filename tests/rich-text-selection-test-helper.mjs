/**
 * Minimal Selection/Range shim for link-panel lifecycle tests.
 */
export function installSelectionShim() {
    /** @type {{ start: number, end: number, collapsed: boolean, cloneRange: () => unknown }|null} */
    let activeRange = null;
    /** @type {unknown|null} */
    let restoredRange = null;

    class MockRange {
        /**
         * @param {number} start
         * @param {number} end
         */
        constructor(start, end) {
            this.start = start;
            this.end = end;
            this.collapsed = start === end;
        }

        cloneRange() {
            return new MockRange(this.start, this.end);
        }
    }

    document.getSelection = () => ({
        rangeCount: activeRange ? 1 : 0,
        isCollapsed: activeRange ? activeRange.collapsed : true,
        getRangeAt: () => activeRange,
        removeAllRanges: () => {
            activeRange = null;
        },
        addRange: (range) => {
            restoredRange = range;
            activeRange = range;
        },
    });

    /** @type {{ command: string, value?: string }[]} */
    const execLog = [];

    document.execCommand = (command, _showDefaultUI, value) => {
        execLog.push({ command, value });
        return true;
    };

    return {
        setRange(start, end) {
            activeRange = new MockRange(start, end);
            restoredRange = null;
        },
        getRestoredRange() {
            return restoredRange;
        },
        getExecLog() {
            return execLog;
        },
        clearExecLog() {
            execLog.length = 0;
        },
        reset() {
            activeRange = null;
            restoredRange = null;
            execLog.length = 0;
        },
    };
}
