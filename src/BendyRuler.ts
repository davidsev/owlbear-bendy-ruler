import OBR, {
    buildPath,
    buildText,
    Command,
    InteractionManager,
    Item,
    Path,
    PathCommand,
    Text,
    Vector2,
} from '@owlbear-rodeo/sdk';
import { grid } from '@davidsev/owlbear-utils';

export class BendyRuler {

    private readonly points: Vector2[] = [];
    private readonly path: Path;
    private readonly pointMarkers: Path;
    private readonly label: Text;
    private interaction?: InteractionManager<[path: Path, pointMarkers: Path, label: Text]>;

    constructor (startPoint: Vector2) {

        this.path = buildPath()
            .position({ x: 0, y: 0 })
            .strokeColor('grey')
            .strokeWidth(10)
            .strokeDash([50, 25])
            .fillOpacity(0)
            .layer('RULER')
            .build();

        this.pointMarkers = buildPath()
            .position({ x: 0, y: 0 })
            .strokeColor('black')
            .strokeWidth(8)
            .fillColor('white')
            .layer('RULER')
            .attachedTo(this.path.id)
            .disableHit(true)
            .build();

        this.label = buildText()
            .position({ x: 0, y: 0 })
            .layer('RULER')
            .plainText('')
            .fontWeight(900)
            .fontSize(75)
            .strokeColor('black')
            .strokeWidth(5)
            .fillColor('white')
            .textAlign('CENTER')
            .textAlignVertical('MIDDLE')
            .textType('PLAIN')
            .width(200)
            .height(100)
            .attachedTo(this.path.id)
            .disableHit(true)
            .build();

        this.addPoint(startPoint);
    }

    /** Add a new point and redraw the line. */
    public async addPoint (point: Vector2) {
        this.points.push(point);

        // Start the interaction, if needed.
        if (!this.interaction)
            this.interaction = await OBR.interaction.startItemInteraction([this.path, this.pointMarkers, this.label]);

        // Redraw the line.
        this.update(null);
    }

    /** Redraw the line, with an optional mouse position to draw to */
    public update (currentPoint: Vector2 | null): Item[] | null {

        if (!this.interaction)
            return null;

        const [update] = this.interaction;
        return update((items) => {
            const [path, pointMarkers, label] = items;

            // Update the path.
            if (path) {
                const pathCommands: PathCommand[] = [];
                for (const point of this.points) {
                    if (!pathCommands.length)
                        pathCommands.push([Command.MOVE, point.x, point.y]);
                    else
                        pathCommands.push([Command.LINE, point.x, point.y]);
                }
                if (currentPoint)
                    pathCommands.push([Command.LINE, currentPoint.x, currentPoint.y]);
                path.commands = pathCommands;
            }

            // Update the dots
            if (pointMarkers) {
                const pointCommands: PathCommand[] = [];
                for (const point of this.points) {
                    pointCommands.push(...this.circle(point, 15));
                }
                pointMarkers.commands = pointCommands;
            }

            // Update the label
            if (label) {
                label.position = this.getLabelPosition(currentPoint);
                const dist = this.calculateTotalLength(currentPoint);
                const distInGridUnit = dist * grid.gridScale.parsed.multiplier;
                label.text.plainText = distInGridUnit.toFixed(grid.gridScale.parsed.digits) + grid.gridScale.parsed.unit;
            }
        });
    }

    private calculateTotalLength (currentPoint: Vector2 | null): number {
        let dist = 0;
        let prev: Vector2 | null = null;
        for (const point of this.points) {
            if (prev) {
                dist += grid.measure(prev, point);
            }
            prev = point;
        }
        if (currentPoint && prev)
            dist += grid.measure(prev, currentPoint);
        return dist;
    }

    private getLabelPosition (currentPoint: Vector2 | null): Vector2 {
        if (this.points.length == 0) {
            if (currentPoint)
                return currentPoint;
            throw new Error('No points to get label position from');
        }

        if (this.points.length == 1 && !currentPoint)
            return this.points[0];

        if (currentPoint) {
            const p1 = this.points[this.points.length - 1];
            const p2 = currentPoint;
            return {
                x: (p1.x + p2.x) / 2 - 100,
                y: (p1.y + p2.y) / 2 - 50,
            };
        } else {
            const p1 = this.points[this.points.length - 2];
            const p2 = this.points[this.points.length - 1];
            return {
                x: (p1.x + p2.x) / 2 - 100,
                y: (p1.y + p2.y) / 2 - 50,
            };
        }
    }

    public finalise (): void {
        // If the length is 0, then we don't want to add anything.
        if (this.calculateTotalLength(null) < 1)
            return this.cancel();

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

    private circle (center: Vector2, radius: number): PathCommand[] {
        return [
            [Command.MOVE, center.x, center.y + radius],
            [Command.CONIC, center.x + radius, center.y + radius, center.x + radius, center.y, Math.PI / 4],
            [Command.CONIC, center.x + radius, center.y - radius, center.x, center.y - radius, Math.PI / 4],
            [Command.CONIC, center.x - radius, center.y - radius, center.x - radius, center.y, Math.PI / 4],
            [Command.CONIC, center.x - radius, center.y + radius, center.x, center.y + radius, Math.PI / 4],
        ];
    }

}
