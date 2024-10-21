import OBR from '@owlbear-rodeo/sdk';
import { Tool } from './Tool';
import { grid } from '@davidsev/owlbear-utils';

function init () {
    OBR.onReady(async () => {
        await grid.awaitReady();
        OBR.tool.createMode(new Tool());
    });
}

init();
