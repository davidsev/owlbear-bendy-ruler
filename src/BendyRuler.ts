import OBR, {
    buildPath,
    buildShape,
    buildText,
    Command,
    InteractionManager,
    Item,
    Path,
    PathCommand,
    Shape,
    Text,
    Vector2,
} from '@owlbear-rodeo/sdk';
import { grid } from './SyncGridData';

class Point implements Vector2 {

    public readonly x: number;
    public readonly y: number;
    public readonly marker: Shape;

    constructor (point: Vector2) {
        this.x = point.x;
        this.y = point.y;

        this.marker = buildShape()
            .fillColor('grey')
            .position(point)
            .layer('RULER')
            .shapeType('CIRCLE')
            .height(50)
            .width(50)
            .disableHit(true)
            .build();
    }
}

type RawInteractionItems = [Path, Text, ...Shape[]];

export class BendyRuler {

    private readonly points: Point[] = [];
    private readonly path: Path;
    private readonly label: Text;
    private interaction?: InteractionManager<RawInteractionItems>;

    constructor (startPoint: Vector2) {

        this.path = buildPath()
            .position({ x: 0, y: 0 })
            .strokeColor('grey')
            .strokeWidth(10)
            .strokeDash([50, 25])
            .fillOpacity(0)
            .layer('RULER')
            .build();

        this.label = buildText()
            .position({ x: 0, y: 0 })
            .layer('RULER')
            .plainText('')
            .fontSize(60)
            .textType('PLAIN')
            .attachedTo(this.path.id)
            .build();

        this.addPoint(startPoint);
    }

    private getRoundedPosition (point: Vector2): Vector2 {
        const dpi = grid.dpi;
        const halfDpi = { x: grid.dpi / 2, y: grid.dpi / 2 };
        return {
            x: Math.round((point.x + halfDpi.x) / dpi) * dpi - halfDpi.x,
            y: Math.round((point.y + halfDpi.y) / dpi) * dpi - halfDpi.y,
        };
    }

    private calcDistanceInSquares (p1: Vector2, p2: Vector2): number {
        const dx = Math.abs(p1.x - p2.x);
        const dy = Math.abs(p1.y - p2.y);
        return Math.max(dx, dy) / grid.dpi;
    }

    /** Add a new point and redraw the line. */
    public async addPoint (newPoint: Vector2) {
        const point = new Point(this.getRoundedPosition(newPoint));
        this.points.push(point);
        point.marker.attachedTo = this.path.id;

        // Reset the interaction.
        await this.initInteraction();

        // Redraw the line.
        this.update(null);
    }

    private async initInteraction () {
        // Work out which items we need to interact with.
        const itemsForInteraction: RawInteractionItems = [this.path, this.label];
        for (const p of this.points)
            itemsForInteraction.push(p.marker);

        // Stash the old interaction, so we can stop it after the new one is ready.  If we stop it now then there will be flicker as the new one isn't instantly ready.
        const oldInteraction = this.interaction;
        this.interaction = await OBR.interaction.startItemInteraction(itemsForInteraction);
        if (oldInteraction) {
            const [_, stop] = oldInteraction;
            stop();
        }
    }

    /** Get items from the interaction, and set the types. */
    private getItems (items: RawInteractionItems): [Path, Text, Shape[]] {
        const points: Shape[] = [];
        for (let i = 1; i < items.length; i += 2)
            points.push(items[i] as Shape);
        return [items[0], items[1], points];
    }

    /** Redraw the line, with an optional mouse position to draw to */
    public update (currentPoint: Vector2 | null): Item[] | null {

        if (!this.interaction)
            return null;

        if (currentPoint)
            currentPoint = this.getRoundedPosition(currentPoint);

        const [update] = this.interaction;
        return update((items) => {
            const [path, label] = this.getItems(items);

            // Update the path.
            if (path) {
                const commands: PathCommand[] = [];
                for (const point of this.points) {
                    if (!commands.length)
                        commands.push([Command.MOVE, point.x, point.y]);
                    else
                        commands.push([Command.LINE, point.x, point.y]);
                }
                if (currentPoint)
                    commands.push([Command.LINE, currentPoint.x, currentPoint.y]);
                path.commands = commands;
            }

            // Update the label
            if (label) {
                label.position = currentPoint || this.points[this.points.length - 1];

                let dist = 0;
                let prev: Point | null = null;
                for (const point of this.points) {
                    if (prev) {
                        dist += this.calcDistanceInSquares(prev, point);
                    }
                    prev = point;
                }
                if (currentPoint && prev)
                    dist += this.calcDistanceInSquares(prev, currentPoint);

                label.text.plainText = dist * grid.gridScale.parsed.multiplier + grid.gridScale.parsed.unit;
            }
        });
    }

    public finalise (finalPoint: Vector2): void {
        this.points.push(new Point(this.getRoundedPosition(finalPoint)));

        const items = this.update(null);
        if (items)
            OBR.scene.items.addItems(items);

        this.cancel();
    }

    public cancel (): void {
        if (!this.interaction)
            return;

        const [_, stop] = this.interaction;
        stop();
        this.interaction = undefined;
    }
}
