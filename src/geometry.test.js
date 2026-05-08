import { describe, expect, it } from 'vitest';
import { FACE_PADDING_RATIO, MIN_RECTANGLE_SIZE } from './config.js';
import {
    denormalizeRect,
    detectionToRectangle,
    isMeaningfulRectangle,
    rectangleFromPoints,
    removeRectangleById
} from './geometry.js';

describe('geometry helpers', () => {
    it('expands detected face boxes by 20%', () => {
        const detection = {
            detection: {
                box: { x: 10, y: 20, width: 30, height: 40 }
            }
        };

        expect(detectionToRectangle(detection, { width: 100, height: 200 }, {
            id: 'detected-1',
            paddingRatio: FACE_PADDING_RATIO
        })).toEqual({
            id: 'detected-1',
            source: 'detected',
            x: 0.04,
            y: 0.06,
            width: 0.42,
            height: 0.28
        });
    });

    it('creates the same rectangle regardless of drag direction', () => {
        expect(rectangleFromPoints({ x: 0.8, y: 0.7 }, { x: 0.2, y: 0.1 })).toEqual({
            x: 0.2,
            y: 0.1,
            width: 0.6000000000000001,
            height: 0.6
        });
    });

    it('filters tiny or zero rectangles', () => {
        const dimensions = { width: 100, height: 100 };

        expect(isMeaningfulRectangle({ x: 0, y: 0, width: 0, height: 0.1 }, dimensions, MIN_RECTANGLE_SIZE)).toBe(false);
        expect(isMeaningfulRectangle({ x: 0, y: 0, width: 0.04, height: 0.1 }, dimensions, MIN_RECTANGLE_SIZE)).toBe(false);
        expect(isMeaningfulRectangle({ x: 0, y: 0, width: 0.06, height: 0.1 }, dimensions, MIN_RECTANGLE_SIZE)).toBe(true);
    });

    it('converts normalized rectangles to canvas pixels', () => {
        expect(denormalizeRect({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, {
            width: 200,
            height: 100
        })).toEqual({
            x: 20,
            y: 20,
            width: 60,
            height: 40
        });
    });

    it('deletes the rectangle with the matching id', () => {
        expect(removeRectangleById([
            { id: 'detected-1', source: 'detected' },
            { id: 'manual-1', source: 'manual' },
            { id: 'manual-2', source: 'manual' }
        ], 'manual-1')).toEqual([
            { id: 'detected-1', source: 'detected' },
            { id: 'manual-2', source: 'manual' }
        ]);
    });
});
