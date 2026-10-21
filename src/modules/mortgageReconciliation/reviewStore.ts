import type { ReviewCommand,ReviewWorkspace } from './workflowTypes'
export interface ReviewStore {
 load():Promise<ReviewWorkspace>
 save(workspace:ReviewWorkspace,command:ReviewCommand,requestId:string):Promise<ReviewWorkspace>
 open(documentId:string):Promise<Blob>
}
export interface PreparedStatement {
 principal:string;escrow:string
 activity:{line:number;postedDate:string;kind:'payment'|'principal'|'reversal'|'escrow_disbursement';description:string;total:string;principal:string;interest:string;escrow:string;fees:string}[]
}
