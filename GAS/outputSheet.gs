function doPost(e){
  /*
  データ形式{
  state: 処理内容(業務開始，登録，削除，出席，業務終了)
  name: 名前
  freeword(?): フリーワード
  mail1: メールアドレス1
  ...
  mail5: メールアドレス5
  time: 時刻
  }
  */
  
  /*送られてきた情報を読み込む*/
  var json = JSON.parse(e.postData.contents);
  const state=json.state;                           //処理内容(register:登録，delete:削除，attend:出席)
  var username=json.name;                           //suicaをタッチした人の名前
  const freeword=json.freeword;                     //フリーワード
  var time=json.time;                               //suicaをタッチした時刻    
  const mail1=json.mail1;                           //メールアドレス
  
  /*フリーワードが設定されていれば，名前に付け足す→name(freeword)*/
  if(freeword !== '-1'){
    username = username + '(' + freeword + ')'; 
  }
  
  /*スプレッドシート読み込み*/
  const ss_root = SpreadsheetApp.getActiveSpreadsheet();              //スプレッドシート読み込み
  const sheet = ss_root.getSheetByName('シート1');                     //スプレッドシート内の1つのシートを読み込み
  const last_row=sheet.getLastRow();                                  //シートの最後の行
  var namelist=sheet.getRange(1, 1, last_row, 1).getValues();         //登録済名前一覧
  const row_attend=2;                                                 //出席状況に対応する列
  const row_attend_time=3;                                            //出席時刻に対応する列
  const row_leave_time=4;                                             //退席時刻に対応する列
  const line_user=find_name_cal(namelist, username, last_row);        //nameに対応する行
  
  //生徒名とシートIDを保存しているシートID(ここを任意に変更)
  const sheetTableId='1c-Jsilnktw5QsnsreLRKbH0iP_xXHuK--DqkPmnXtNE';
  var returnText='success';
  
  /*年度が変わった場合*/
  //新規年度フォルダ[20??年度]を作成
  //var folder  = DriveApp.createFolder('20??年度');
  //人数分のスプレッドシートと月ごとのシートを作成(?)
  //各生徒のスプレッドシートIDをスプレッドシート対応表に上書き
  
  /*新規登録*/
  if(state === 'register'){
    returnText=Register(namelist, username, sheetTableId, sheet, last_row);
  }
  
  /*登録情報の削除*/
  if(state === 'delete'){
    returnText=Delete(sheet, namelist, last_row, sheetTableId, username);
  }
  
  /*リアルタイム出席状況を書き込み*/
  if(state === 'attend'){
    returnText=Attend(namelist, username, time, mail1, sheet, last_row);
  }
 
  /*出席記録を書き込み*/
  if(state === 'update'){
    returnText=Update(sheet, last_row, sheetTableId);
  }
  
  /*リアルタイム出席状況を初期化*/
  if(state === 'reset'){
    returnText=Reset(sheet, last_row); 
  }
  
  return ContentService.createTextOutput(returnText);
}

/*新規登録関数*/
function Register(namelist, username, sheetTableId, sheet, last_row){
  const isRegisterd=find_name_cal(namelist, username, last_row);
  if(isRegisterd === -1){
    //指定のフォルダにシート作成
    //ルートフォルダにシートを作成
    const newSheet=SpreadsheetApp.create(username);
    const newfile=DriveApp.getFileById(newSheet.getId());
    const mon=['4','5','6','7','8','9','10','11','12','1','2','3'];
    for(var i=0; i<12; i++){
      newSheet.insertSheet(mon[i]+'月');
    }
    const sheet1=newSheet.getSheetByName('シート1');
    newSheet.deleteSheet(sheet1);
    //指定のフォルダに移動
    const folderId = DriveApp.getFoldersByName('2020年度').next().getId();
    DriveApp.getFolderById(folderId).addFile(newfile);
    DriveApp.getRootFolder().removeFile(newfile);
    
    //対応するIDを対応表に書き込み
    const ss_ID=SpreadsheetApp.openById(sheetTableId);
    const sheet_ID=ss_ID.getSheetByName('シート1');
    const last_row_ID=sheet_ID.getLastRow();
    sheet_ID.getRange(last_row_ID+1, 1).setValue(username);
    sheet_ID.getRange(last_row_ID+1, 2).setValue(newSheet.getId());
    
    //出席管理シートに追加
    sheet.getRange(last_row+1, 1).setValue(username);
    sheet.getRange(last_row+1, 2).setValue(0);
    
    return 'success';
  }else{
    //すでに名前が登録されている場合，failを返す
    return 'fail';
  }
}

/*登録情報を削除する関数*/
function Delete(sheet, namelist, last_row, sheetTableId, username){
  const ss_ID=SpreadsheetApp.openById(sheetTableId);
  const sheet_ID=ss_ID.getSheetByName('シート1');
  const last_row_ID=sheet_ID.getLastRow();
  const namelist_id=sheet_ID.getRange(1, 1, last_row_ID, 1).getValues();
  const line_user=find_name_cal(namelist, username, last_row);
  const line_user_id=find_name_cal(namelist_id, username, last_row_ID);
  
  if(line_user !== -1 && line_user_id !== -1){ 
    //名前が登録されていれば一覧から削除
    sheet.deleteRows(line_user);
    sheet_ID.deleteRows(line_user_id);
  }else{
    //名前が登録されていなければfailを返す
    return 'fail';
  }
  
  return 'success';
}

/*出席退席操作を行う関数*/
function Attend(namelist, username, time, mail1, sheet, last_row){
  const line_user=find_name_cal(namelist, username, last_row);
  const row_attend=2;                                    //出席状況に対応する列
  const row_attend_time=3;                               //出席時刻に対応する列
  const row_leave_time=4;                                //退席時刻に対応する列
  
  if(line_user !== -1){
    //出席と退席のステータスを変更
    const isAttended=sheet.getRange(line_user, row_attend).getValue();
    if(isAttended === 1){
      //ステータスが出席であれば退席にし，退席時刻を記入
      sheet.getRange(line_user, row_attend).setValue(0);
      sheet.getRange(line_user, row_leave_time).setValue(time);
    }else{
      //ステータスが退席であれば出席にし，出席時刻を記入
      sheet.getRange(line_user, row_attend).setValue(1);
      sheet.getRange(line_user, row_attend_time).setValue(time);
    }
    
    //出席確認メール送信
    //GmailApp.sendemail('宛先アドレス','件名','本文','オプション')
    //GmailApp.sendEmail(mail1, 'テスト送信', 'テスト送信です．',{name:'テスト送信者'});
    
    return 'success';
  }else{
    //名前が登録されていない場合failを返す
    return 'fail';
  }
}

/*出席記録を更新する*/
function Update(sheet, last_row, sheetTableId){
  //ユーザーのスプレッドシートIDを取得
  const ss_ID=SpreadsheetApp.openById(sheetTableId);
  const sheet_ID=ss_ID.getSheetByName('シート1');
  const last_row_ID=sheet_ID.getLastRow();
  
  const Idlist=sheet_ID.getRange(1, 1, last_row_ID, 2).getValues();
  
  //ユーザの出席状況を取得
  const attendTime=sheet.getRange(2, 1, last_row-1, 4).getValues();
  //日付取得
  var today = new Date();
  var month = today.getMonth()+1;
  var date = today.getDate();
  
  for(var i=0; i<last_row_ID; i++){
    const username=attendTime[i][0];
    var line=find_name_cal(Idlist, username, last_row_ID);
    if(line !== -1){
      const user_sheet_ID=Idlist[line-1][1];
      //対応するスプレッドシートに出席記録を書き込み
      const ss_user=SpreadsheetApp.openById(user_sheet_ID);
      const sheet_user=ss_user.getSheetByName(month+'月');
      
      if(attendTime[i][2] !== 0){
        //出席時刻が0以外の場合→出席した場合
        sheet_user.getRange(date, 1).setValue(date+'日');
        sheet_user.getRange(date, 2).setValue(1);
      }else{
        //出席時刻が0の場合→出席しなかった場合
        sheet_user.getRange(date, 1).setValue(date+'日');
        sheet_user.getRange(date, 2).setValue(0);
      }
    }else{
      return 'fail';
    }
  }
  return 'success';
}

/*リアルタイム出席状況を初期化*/
function Reset(sheet, last_row){
  var zero=sheet.getRange(2, 2, last_row-1, 3).getValues();
  for(var i=0; i<last_row-1; i++){
    zero[i][0]=0;
    zero[i][1]=0;
    zero[i][2]=0;
  }
  sheet.getRange(2, 2, last_row-1, 3).setValues(zero);
  return 'success';
}
     
/*nameに対応する行を探索，見つからなければ-1を返す関数*/
function find_name_cal(namelist, name, last_row){
  for(var i=0; i<last_row; i++){
    if(namelist[i][0] === name) return i+1; 
  }
  return -1;
}