function doPost(e){
  /*
  �f�[�^�`��{
  state: �������e(�Ɩ��J�n�C�o�^�C�폜�C�o�ȁC�Ɩ��I��)
  name: ���O
  freeword(?): �t���[���[�h
  mail1: ���[���A�h���X1
  ...
  mail5: ���[���A�h���X5
  time: ����
  }
  */
  
  /*�����Ă�������ǂݍ���*/
  var json = JSON.parse(e.postData.contents);
  const state=json.state;                           //�������e(register:�o�^�Cdelete:�폜�Cattend:�o��)
  var username=json.name;                           //suica���^�b�`�����l�̖��O
  const freeword=json.freeword;                     //�t���[���[�h
  var time=json.time;                               //suica���^�b�`��������    
  const mail1=json.mail1;                           //���[���A�h���X
  
  /*�t���[���[�h���ݒ肳��Ă���΁C���O�ɕt��������name(freeword)*/
  if(freeword !== '-1'){
    username = username + '(' + freeword + ')'; 
  }
  
  /*�X�v���b�h�V�[�g�ǂݍ���*/
  const ss_root = SpreadsheetApp.getActiveSpreadsheet();              //�X�v���b�h�V�[�g�ǂݍ���
  const sheet = ss_root.getSheetByName('�V�[�g1');                     //�X�v���b�h�V�[�g����1�̃V�[�g��ǂݍ���
  const last_row=sheet.getLastRow();                                  //�V�[�g�̍Ō�̍s
  var namelist=sheet.getRange(1, 1, last_row, 1).getValues();         //�o�^�ϖ��O�ꗗ
  const row_attend=2;                                                 //�o�ȏ󋵂ɑΉ������
  const row_attend_time=3;                                            //�o�Ȏ����ɑΉ������
  const row_leave_time=4;                                             //�ސȎ����ɑΉ������
  const line_user=find_name_cal(namelist, username, last_row);        //name�ɑΉ�����s
  
  //���k���ƃV�[�gID��ۑ����Ă���V�[�gID(������C�ӂɕύX)
  const sheetTableId='1c-Jsilnktw5QsnsreLRKbH0iP_xXHuK--DqkPmnXtNE';
  var returnText='success';
  
  /*�N�x���ς�����ꍇ*/
  //�V�K�N�x�t�H���_[20??�N�x]���쐬
  //var folder  = DriveApp.createFolder('20??�N�x');
  //�l�����̃X�v���b�h�V�[�g�ƌ����Ƃ̃V�[�g���쐬(?)
  //�e���k�̃X�v���b�h�V�[�gID���X�v���b�h�V�[�g�Ή��\�ɏ㏑��
  
  /*�V�K�o�^*/
  if(state === 'register'){
    returnText=Register(namelist, username, sheetTableId, sheet, last_row);
  }
  
  /*�o�^���̍폜*/
  if(state === 'delete'){
    returnText=Delete(sheet, namelist, last_row, sheetTableId, username);
  }
  
  /*���A���^�C���o�ȏ󋵂���������*/
  if(state === 'attend'){
    returnText=Attend(namelist, username, time, mail1, sheet, last_row);
  }
 
  /*�o�ȋL�^����������*/
  if(state === 'update'){
    returnText=Update(sheet, last_row, sheetTableId);
  }
  
  /*���A���^�C���o�ȏ󋵂�������*/
  if(state === 'reset'){
    returnText=Reset(sheet, last_row); 
  }
  
  return ContentService.createTextOutput(returnText);
}

/*�V�K�o�^�֐�*/
function Register(namelist, username, sheetTableId, sheet, last_row){
  const isRegisterd=find_name_cal(namelist, username, last_row);
  if(isRegisterd === -1){
    //�w��̃t�H���_�ɃV�[�g�쐬
    //���[�g�t�H���_�ɃV�[�g���쐬
    const newSheet=SpreadsheetApp.create(username);
    const newfile=DriveApp.getFileById(newSheet.getId());
    const mon=['4','5','6','7','8','9','10','11','12','1','2','3'];
    for(var i=0; i<12; i++){
      newSheet.insertSheet(mon[i]+'��');
    }
    const sheet1=newSheet.getSheetByName('�V�[�g1');
    newSheet.deleteSheet(sheet1);
    //�w��̃t�H���_�Ɉړ�
    const folderId = DriveApp.getFoldersByName('2020�N�x').next().getId();
    DriveApp.getFolderById(folderId).addFile(newfile);
    DriveApp.getRootFolder().removeFile(newfile);
    
    //�Ή�����ID��Ή��\�ɏ�������
    const ss_ID=SpreadsheetApp.openById(sheetTableId);
    const sheet_ID=ss_ID.getSheetByName('�V�[�g1');
    const last_row_ID=sheet_ID.getLastRow();
    sheet_ID.getRange(last_row_ID+1, 1).setValue(username);
    sheet_ID.getRange(last_row_ID+1, 2).setValue(newSheet.getId());
    
    //�o�ȊǗ��V�[�g�ɒǉ�
    sheet.getRange(last_row+1, 1).setValue(username);
    sheet.getRange(last_row+1, 2).setValue(0);
    
    return 'success';
  }else{
    //���łɖ��O���o�^����Ă���ꍇ�Cfail��Ԃ�
    return 'fail';
  }
}

/*�o�^�����폜����֐�*/
function Delete(sheet, namelist, last_row, sheetTableId, username){
  const ss_ID=SpreadsheetApp.openById(sheetTableId);
  const sheet_ID=ss_ID.getSheetByName('�V�[�g1');
  const last_row_ID=sheet_ID.getLastRow();
  const namelist_id=sheet_ID.getRange(1, 1, last_row_ID, 1).getValues();
  const line_user=find_name_cal(namelist, username, last_row);
  const line_user_id=find_name_cal(namelist_id, username, last_row_ID);
  
  if(line_user !== -1 && line_user_id !== -1){ 
    //���O���o�^����Ă���Έꗗ����폜
    sheet.deleteRows(line_user);
    sheet_ID.deleteRows(line_user_id);
  }else{
    //���O���o�^����Ă��Ȃ����fail��Ԃ�
    return 'fail';
  }
  
  return 'success';
}

/*�o�ȑސȑ�����s���֐�*/
function Attend(namelist, username, time, mail1, sheet, last_row){
  const line_user=find_name_cal(namelist, username, last_row);
  const row_attend=2;                                    //�o�ȏ󋵂ɑΉ������
  const row_attend_time=3;                               //�o�Ȏ����ɑΉ������
  const row_leave_time=4;                                //�ސȎ����ɑΉ������
  
  if(line_user !== -1){
    //�o�ȂƑސȂ̃X�e�[�^�X��ύX
    const isAttended=sheet.getRange(line_user, row_attend).getValue();
    if(isAttended === 1){
      //�X�e�[�^�X���o�Ȃł���ΑސȂɂ��C�ސȎ������L��
      sheet.getRange(line_user, row_attend).setValue(0);
      sheet.getRange(line_user, row_leave_time).setValue(time);
    }else{
      //�X�e�[�^�X���ސȂł���Ώo�Ȃɂ��C�o�Ȏ������L��
      sheet.getRange(line_user, row_attend).setValue(1);
      sheet.getRange(line_user, row_attend_time).setValue(time);
    }
    
    //�o�Ȋm�F���[�����M
    //GmailApp.sendemail('����A�h���X','����','�{��','�I�v�V����')
    //GmailApp.sendEmail(mail1, '�e�X�g���M', '�e�X�g���M�ł��D',{name:'�e�X�g���M��'});
    
    return 'success';
  }else{
    //���O���o�^����Ă��Ȃ��ꍇfail��Ԃ�
    return 'fail';
  }
}

/*�o�ȋL�^���X�V����*/
function Update(sheet, last_row, sheetTableId){
  //���[�U�[�̃X�v���b�h�V�[�gID���擾
  const ss_ID=SpreadsheetApp.openById(sheetTableId);
  const sheet_ID=ss_ID.getSheetByName('�V�[�g1');
  const last_row_ID=sheet_ID.getLastRow();
  
  const Idlist=sheet_ID.getRange(1, 1, last_row_ID, 2).getValues();
  
  //���[�U�̏o�ȏ󋵂��擾
  const attendTime=sheet.getRange(2, 1, last_row-1, 4).getValues();
  //���t�擾
  var today = new Date();
  var month = today.getMonth()+1;
  var date = today.getDate();
  
  for(var i=0; i<last_row_ID; i++){
    const username=attendTime[i][0];
    var line=find_name_cal(Idlist, username, last_row_ID);
    if(line !== -1){
      const user_sheet_ID=Idlist[line-1][1];
      //�Ή�����X�v���b�h�V�[�g�ɏo�ȋL�^����������
      const ss_user=SpreadsheetApp.openById(user_sheet_ID);
      const sheet_user=ss_user.getSheetByName(month+'��');
      
      if(attendTime[i][2] !== 0){
        //�o�Ȏ�����0�ȊO�̏ꍇ���o�Ȃ����ꍇ
        sheet_user.getRange(date, 1).setValue(date+'��');
        sheet_user.getRange(date, 2).setValue(1);
      }else{
        //�o�Ȏ�����0�̏ꍇ���o�Ȃ��Ȃ������ꍇ
        sheet_user.getRange(date, 1).setValue(date+'��');
        sheet_user.getRange(date, 2).setValue(0);
      }
    }else{
      return 'fail';
    }
  }
  return 'success';
}

/*���A���^�C���o�ȏ󋵂�������*/
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
     
/*name�ɑΉ�����s��T���C������Ȃ����-1��Ԃ��֐�*/
function find_name_cal(namelist, name, last_row){
  for(var i=0; i<last_row; i++){
    if(namelist[i][0] === name) return i+1; 
  }
  return -1;
}