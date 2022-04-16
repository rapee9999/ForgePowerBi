/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import { VisualSettings } from "./settings";
export class Visual implements IVisual {
    // pbiviz new
    private target: HTMLElement;
    private updateCount: number;
    private settings: VisualSettings;
    private textNode: Text;

    private pbioptions: VisualConstructorOptions;

    // Autodess's Forge Viewer declarations
    // URN to a translated model
    private readonly DOCUMENT_URN: string = 'urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6cmF6ajRidjE5eGZtZTAyNWFzMmVhbGRnYm51dW9ubjYtbXlmaXJzdGFwcC9yYWNhZHZhbmNlZHNhbXBsZXByb2plY3QucnZ0';
    // if get token from your server
    //private ACCESS_TOKEN: string = null;  
    private MY_SERVER_ENDPOINT = '<your server endpoint to get token>' //e.g. 'https://xiaodong-forge-viewer-test.herokuapp.com/api/forge/oauth/token'
    // if hard coded the token
    private ACCESS_TOKEN: string = '<hard-coded token (from other tool)>';
    // model viewer
    private forge_viewer: Autodesk.Viewing.GuiViewer3D = null;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);

        // model viewer forge
        this.pbioptions = options; 
        this.target = options.element;
        this.target.innerHTML = '<div id="forge-viewer" ></div>';

        if (typeof document !== "undefined") {

            if(this.ACCESS_TOKEN != null){
                //hard-coded token, load the model directly
                this.initializeViewer("forge-viewer");  
            }else{
                this.getToken(this.MY_SERVER_ENDPOINT); 
                //inside getToken callback, will load the model
            }
        }
    }

    private async initializeViewer(placeHolderDOMid: string): Promise<void> {
        const viewerContainer = document.getElementById(placeHolderDOMid)
        //load Forge Viewer scripts js and style css
        await this.loadForgeViewerScriptAndStyle();

        const options = {
            env: 'AutodeskProduction',
            accessToken: this.ACCESS_TOKEN
        }

        var documentId = this.DOCUMENT_URN;
        console.log('documentId:' + documentId); 

        Autodesk.Viewing.Initializer(options, () => {
            this.forge_viewer = new Autodesk.Viewing.GuiViewer3D(viewerContainer)
            this.forge_viewer.start();
            Autodesk.Viewing.Document.load(documentId, (doc)=>{

                //if specific viewerable, provide its guid
                //otherwise, load the default view
                var viewableId = undefined 
                var viewables:Autodesk.Viewing.BubbleNode = (viewableId ? doc.getRoot().findByGuid(viewableId) : doc.getRoot().getDefaultGeometry());
                this.forge_viewer.loadDocumentNode(doc, viewables, {}).then(i => {
                  console.log('document has been loaded') 
                  
                  this.forge_viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT,res=>{
                      //GEOMETRY_LOADED_EVENT
                      console.log('GEOMETRY_LOADED_EVENT triggered!');

                      console.log('dumpping dbIds...');

                      this.forge_viewer.getObjectTree( tree => {
                        var leaves = [];
                        tree.enumNodeChildren(tree.getRootId(),  dbId=> {
                            if (tree.getChildCount(dbId) === 0) {
                                leaves.push(dbId);
                            }
                        }, true);
                        console.log('DbId Array: ' + leaves);

                        //possible to update PowerBI data source ??
                        //SQL database / Push Data ...
                        //see PowerBI community post:
                        //

                     });  
                  })

                  this.forge_viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT,res=>{
                    
                    //Investigation on how to update PowerBI Visual when objects are selected in Forge Viewer
                    if (res.dbIdArray.length ===1 ) { 
                        const dbId = res.dbIdArray[0];
                        console.log('Autodesk.Viewing.SELECTION_CHANGED_EVENT:'+dbId)

                        //this.selectionMgr.select()
                        
                    }
                  }) 
                });

            }, (err)=>{
                console.error('onDocumentLoadFailure() - errorCode:' + err); 
            });
          }); 

    }

    private async loadForgeViewerScriptAndStyle(): Promise<void> {

        return new Promise<void>((reslove,reject) => {

            let forgeviewerjs = document.createElement('script');
            forgeviewerjs.src = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/viewer3D.js';

            forgeviewerjs.id = 'forgeviewerjs';
            document.body.appendChild(forgeviewerjs);

            forgeviewerjs.onload = () => {
                console.info("Viewer scripts loaded"); 
                let link = document.createElement("link");
                link.rel = 'stylesheet';
                link.href = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/style.min.css';
                link.type = 'text/css';
                link.id = "forgeviewercss";
                document.body.appendChild(link); 
                console.info("Viewer CSS loaded"); 

                reslove();
            };

            forgeviewerjs.onerror = (err) => {
                console.info("Viewer scripts error:" +err ); 
                reject(err);
            }; 

        })

    };

    private async getToken(endpoint): Promise<void> {
            
        return new Promise<void>(res => {
            $.ajax({
                url: endpoint,

              }).done( res=> {
                console.log('get token done!')
                console.log(res.access_token);

                //when token is ready, start to initialize viewer
                this.ACCESS_TOKEN = res.access_token;
                this.initializeViewer("forge-viewer"); 
              })  
        })  
    } 

    public update(options: VisualUpdateOptions) {

        if(options.type == powerbi.VisualUpdateType.Resize || options.type == powerbi.VisualUpdateType.ResizeEnd ) //resizing or moving
            return;

        debugger;

         if (!this.forge_viewer) {
             return;
         }
         console.log('update with VisualUpdateOptions') 

         const dbIds = options.dataViews[0].table.rows.map(r => 
            <number>r[0].valueOf());
         console.log('dbIds: '  +dbIds)

         
            
         this.forge_viewer.showAll();

        //  this.forge_viewer.impl.setGhostingBrightness(true); //for isolate effect 
         this.forge_viewer.isolate(dbIds);

         //this.settings = ForgeViewerVisual.parseSettings(options && options.dataViews && options.dataViews[0]);

    }

}