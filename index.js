window.onload = function () {
  // 多语言配置
  // 中文url为http://localhost(主机名):8081(端口)/download-agent?language=zh_CN
  // 英文url为http://localhost(主机名):8081(端口)/download-agent?language=en_US
  var language = agentDownloadCommonFunctions.getQueryVariable("language");
  document.title = language === "en_US" ? "AgentDownload" : "探针下载";

  agentDownloadCommonFunctions.adjustPosition();

  window.addEventListener("resize", function () {
    agentDownloadCommonFunctions.adjustPosition();
  });

  agentDownloadCommonFunctions.sendRequest(language, "ch_en.json", function (_, localeData) {
    var ch_en_json_data = JSON.parse(localeData);

    agentDownloadCommonFunctions.initPage(language, ch_en_json_data);
    var successfulRequests = 0;
    var REQUEST_COUNT = 3; // 请求的总数，所有请求完成才展示页面，否则显示转圈加载动画

    agentDownloadCommonFunctions.sendRequest(
      language,
      "/api/webservice/system-custom/custominfo",
      function (infoFetchError, res) {
        if (infoFetchError) {
          agentDownloadCommonFunctions.promptNetworkError(overlay, ch_en_json_data["error"]);
          return;
        }
        var result = JSON.parse(res)["result"];
        agentDownloadCommonFunctions.setLogoCustomData(language, ch_en_json_data, result);

        successfulRequests++;
        if (successfulRequests === REQUEST_COUNT) {
          agentDownloadCommonFunctions.requestDataSuccess();
        }
      }
    );
    agentDownloadCommonFunctions.sendRequest(
      language,
      "/api/webservice/system/agentdownload/info",
      function (infoFetchError, info) {
        if (infoFetchError) {
          agentDownloadCommonFunctions.promptNetworkError(overlay, ch_en_json_data["error"]);
          return;
        }
        var res = JSON.parse(info)["result"];
        agentDownloadCommonFunctions.setCardData(language, ch_en_json_data, res);

        successfulRequests++;
        if (successfulRequests === REQUEST_COUNT) {
          agentDownloadCommonFunctions.requestDataSuccess();
        }
      }
    );
    agentDownloadCommonFunctions.sendRequest(
      language,
      "/api/webservice/system/agentdownload/patch/list",
      function (listFetchError, list) {
        if (listFetchError) {
          agentDownloadCommonFunctions.promptNetworkError(overlay, ch_en_json_data["error"]);
          return;
        }
        var result = JSON.parse(list)["result"];
        var patchList = result["patches"];
        var exe = result["exe"];

        var system_patch_download = document.getElementById("system_patch_download_div");

        var tbody = agentDownloadCommonFunctions.createPatchDownloadTableOutline(
          system_patch_download,
          language,
          ch_en_json_data
        );

        var collatedData = agentDownloadCommonFunctions.collatePatches(patchList);
        var collatedPatches = collatedData.collatedPatches;
        var systemVersions = collatedData.systemVersions;
        agentDownloadCommonFunctions.setSystemVersion(systemVersions);

        for (var system_name in collatedPatches) {
          var patches = collatedPatches[system_name];
          if (!agentDownloadCommonFunctions.isSpecialPatch(patches)) {
            agentDownloadCommonFunctions.createRegularTableRows(
              tbody,
              system_name,
              collatedPatches[system_name],
              language,
              ch_en_json_data
            );
          } else {
            agentDownloadCommonFunctions.createSpecialTableRows(
              tbody,
              system_name,
              collatedPatches[system_name],
              language,
              ch_en_json_data,
              exe
            );
          }
        }
        successfulRequests++;
        if (successfulRequests === REQUEST_COUNT) {
          agentDownloadCommonFunctions.requestDataSuccess();
        }
      }
    );
  });
};

var agentDownloadCommonFunctions = (function () {
  var isIE =
    navigator.userAgent.indexOf("MSIE") > -1 || navigator.userAgent.indexOf("Trident") > -1;

  function setLogoCustomData(language, localeData, res) {
    var teshSupport = localeData["tech_support"][language];
    var colon = localeData["common_colon"][language];
    var comma = localeData["common_comma"][language];
    document.getElementById("ues").src = res["productLogoUrl"];
    document.getElementById("title").textContent =
      res["companyName"] + (language === "en_US" ? " " : "") + res["productFullName"];
    document.getElementById("company_name").textContent = res["companyName"];
    document.getElementById("sub_title").textContent = res["productFullName"];
    document.getElementById("footer").textContent =
      res["copyright"] + comma + " " + teshSupport + colon + " " + res["techSupportEmail"];
  }
  // 获取url请求参数
  function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      if (pair[0] === variable) {
        return pair[1];
      }
    }
    return "zh_CN"; //默认使用中文
  }
  //复制内容到剪贴板
  function copy_command() {
    var text = document.getElementById("command").textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      var textarea = document.createElement("textarea");
      document.body.appendChild(textarea);
      textarea.style.position = "fixed";
      textarea.style.clip = "rect(0 0 0 0)";
      textarea.style.top = "10px";
      textarea.value = text;
      textarea.select();
      document.execCommand("copy", true);
      document.body.removeChild(textarea);
    }
  }
  // 发送ajax请求
  function sendRequest(language, url, callback) {
    var xhr;
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
    } else {
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xhr.open("GET", url, true);
    xhr.setRequestHeader("X-Api-Language", language);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          callback(null, xhr.responseText);
        } else {
          callback(new Error("Request failed with status code " + xhr.status));
        }
      }
    };
    xhr.send();
  }

  function download(url) {
    window.open(url);
  }

  //调整标题元素在页面缩放的位置
  function adjustPosition() {
    var windowWidth = window.innerWidth;
    var leftValue = (windowWidth - 1200) / 2 + 40;
    document.querySelector(".system").style.paddingLeft = leftValue + "px";
  }

  //根据元素id和语言设置内容
  function setElementContentByLanguage(id, language, data) {
    var element = document.getElementById(id);
    element.textContent = data[id][language];
  }

  function promptNetworkError(messageContainer, message) {
    messageContainer.innerHTML = message;
  }

  function initPage(language, localeData) {
    setElementContentByLanguage("feature_one", language, localeData);
    setElementContentByLanguage("feature_two", language, localeData);
  }

  //根据元素class和语言设置内容
  function setMultipleElementContentByLanguage(
    classSelectors, //类选择器字符串
    language, //语言参数
    languageKey, //双语对照表里的键名称
    localeData
  ) {
    var elements = document.querySelectorAll(classSelectors);
    for (var i = 0; i < elements.length; i++) {
      elements[i].textContent = localeData[languageKey][language];
    }
  }

  function setWindowsCardData(language, localeData, res) {
    setElementContentByLanguage("win_version", language, localeData);
    document.getElementById("windows_version_value").textContent = res["winVersion"];
    document.getElementById("win_md5").innerHTML = res["winmd5"];

    document.getElementById("win_download").addEventListener("click", function () {
      download("/api/webservice/system/agentdownload?type=win");
    });

    setElementContentByLanguage("system_patch_download_button_content", language, localeData);
    setElementContentByLanguage("system_patch_download_tip_header", language, localeData);
  }

  function setLinuxCardData(language, localeData, res) {
    setElementContentByLanguage("linux_version", language, localeData);
    document.getElementById("linux_version_value").textContent = res["linuxVersion"];
    document.getElementById("lin_md5").textContent = res["linuxmd5"];

    var linux_download = document.getElementById("linux_download");
    linux_download.addEventListener("click", function () {
      download("/api/webservice/system/agentdownload?type=linux");
    });
  }

  function setLinuxCommandLineCardData(language, localeData, res) {
    setElementContentByLanguage("linux_command_line", language, localeData);
    document.getElementById("command").innerHTML = res["commandLine"];
    setElementContentByLanguage("copy_command", language, localeData);

    var copy_commandEle = document.getElementById("copy_command");
    if (language === "en_US") {
      copy_commandEle.style.marginTop = "60px";
    }

    document.getElementById("copy_command").addEventListener("click", function () {
      copy_command();
      document.getElementById("copy_success_content").textContent =
        localeData["copy_success"][language];

      var popUpBox = document.querySelector(".popUpBox");
      popUpBox.style.display = "block";
      setTimeout(function () {
        popUpBox.style.display = "none";
      }, 2000);
    });
  }

  function setMacOSCardData(language, localeData, res) {
    setElementContentByLanguage("macos_version", language, localeData);
    document.getElementById("macos_version_value").textContent = res["macVersion"];
    document.getElementById("macos_md5").textContent = res["macmd5"];
    document.getElementById("macos_download").addEventListener("click", function () {
      download("/api/webservice/system/agentdownload?type=macos_x86-64");
    });
  }

  function getDownloadMap() {
    var downloadMap = {};
    var optionLiElements = document.querySelectorAll(".systemVersionOption li");
    for (var i = 0; i < optionLiElements.length; i++) {
      var optionLiElement = optionLiElements[i];
      downloadMap[optionLiElement.textContent] = optionLiElement.id;
    }

    return downloadMap;
  }

  function addOptionsClickHandler() {
    var optionLiElements = document.querySelectorAll(".systemVersionOption li");
    for (var i = 0; i < optionLiElements.length; i++) {
      optionLiElements[i].addEventListener("click", function () {
        var text = this.textContent;
        document.getElementById("select_system_version").textContent = text;
        document.querySelector(".systemVersionOption").style.display = "none";
        document.getElementById("localization_system_download").style.visibility = "visible";
        document.getElementById("dropDownPic").style.webkitTransform =
          "rotate(180deg) rotate(180deg)";
        document.getElementById("dropDownPic").style.msTransform = "rotate(180deg) rotate(180deg)";
      });
    }
  }

  function clickLocalizationSystemDownloadButtonHandler(downloadMap, language, localeData) {
    var versionContent = document.getElementById("select_system_version").textContent;
    var tip = localeData["select_system_version"][language];
    if (versionContent === tip) {
      var systemVersionChoosePrompt = document.getElementById("systemVersionChoosePrompt");
      systemVersionChoosePrompt.textContent = localeData["select_system_version"][language];
      systemVersionChoosePrompt.style.display = "block";

      // 需要调整立即下载按钮的位置;
      var localization_system_download = document.getElementById("localization_system_download");
      var maginTop = language === "en_US" ? "43px" : "27px";
      localization_system_download.style.marginTop = maginTop;
    } else {
      download("/api/webservice/system/agentdownload?type=" + downloadMap[versionContent]);
    }
  }

  function setLocalizedSystemCardData(language, localeData) {
    setElementContentByLanguage("localization_system_version", language, localeData);
    setElementContentByLanguage("localization_system_version_tip", language, localeData);
    setElementContentByLanguage("select_system_version", language, localeData);
    setElementContentByLanguage("uos_arm64", language, localeData);
    setElementContentByLanguage("uos_x86-64", language, localeData);
    setElementContentByLanguage("kylin_arm64", language, localeData);
    setElementContentByLanguage("kylin_x86-64", language, localeData);

    if (language === "en_US") {
      document.getElementById("localization_system_download").style.marginTop = "63px";
    }

    var downloadMap = getDownloadMap(); // 下载映射
    addOptionsClickHandler();

    // 点击空白处下拉框收起
    var systemVersionChoose = document.querySelector(".systemVersionChoose");
    var systemVersionOption = document.querySelector(".systemVersionOption");
    document.addEventListener("click", function (event) {
      if (
        !systemVersionChoose.contains(event.target) &&
        !systemVersionOption.contains(event.target)
      ) {
        systemVersionOption.style.display = "none";
      }
      var localizationSystemDownload = document.getElementById("localization_system_download");
      var visibility = window.getComputedStyle(localizationSystemDownload).visibility;
      if (visibility === "hidden") {
        localizationSystemDownload.style.visibility = "visible";
      }
      document.getElementById("dropDownPic").style.webkitTransform =
        "rotate(180deg) rotate(180deg)";
      document.getElementById("dropDownPic").style.msTransform = "rotate(180deg) rotate(180deg)";
    });

    systemVersionChoose.addEventListener("click", function (event) {
      event.stopPropagation();
      var systemVersionOption = document.querySelector(".systemVersionOption");
      var systemVersionOptionDisplayValue = window.getComputedStyle(systemVersionOption).display;
      var systemVersionChoosePrompt = document.getElementById("systemVersionChoosePrompt");
      var systemVersionChoosePromptDisplayValue =
        window.getComputedStyle(systemVersionChoosePrompt).display;
      if (systemVersionOptionDisplayValue === "none") {
        systemVersionOption.style.top = "32px";
        systemVersionOption.style.display = "block";
        var currentVersion = document.getElementById("select_system_version").textContent;
        var optionLiElements = document.querySelectorAll(".systemVersionOption li");
        for (var i = 0; i < optionLiElements.length; i++) {
          var optionLiElement = optionLiElements[i];
          if (currentVersion === optionLiElement.textContent) {
            optionLiElement.className = "select_li";
          } else {
            optionLiElement.className = "";
          }
        }

        document.getElementById("dropDownPic").style.webkitTransform = "rotate(180deg)";
        document.getElementById("dropDownPic").style.msTransform = "rotate(180deg)";

        if (systemVersionChoosePromptDisplayValue === "block") {
          systemVersionChoosePrompt.style.display = "none";
          var maginTop = language === "en_US" ? "63px" : "47px";
          document.getElementById("localization_system_download").style.marginTop = maginTop;
        }

        document.getElementById("localization_system_download").style.visibility = "hidden";
      } else {
        systemVersionOption.style.display = "none";
        document.getElementById("localization_system_download").style.visibility = "visible";
        document.getElementById("dropDownPic").style.webkitTransform =
          "rotate(180deg) rotate(180deg)";
        document.getElementById("dropDownPic").style.msTransform = "rotate(180deg) rotate(180deg)";
      }
    });

    document.getElementById("localization_system_download").addEventListener("click", function () {
      clickLocalizationSystemDownloadButtonHandler(downloadMap, language, localeData);
    });
  }

  function setCardData(language, localeData, res) {
    setWindowsCardData(language, localeData, res);
    setLinuxCardData(language, localeData, res);
    setLinuxCommandLineCardData(language, localeData, res);
    setMacOSCardData(language, localeData, res);
    setLocalizedSystemCardData(language, localeData);

    setMultipleElementContentByLanguage(".file_md5", language, "file_md5", localeData);
    setMultipleElementContentByLanguage(".download_button", language, "download_now", localeData);
  }

  //整理ajax请求响应的patches数据
  function collatePatches(patches) {
    var systemVersions = [];
    var collatedPatches = {};
    for (var i = 0; i < patches.length; i++) {
      var patch = patches[i];
      if (!collatedPatches[patch.system]) {
        systemVersions.push(patch.system);
        collatedPatches[patch.system] = [];
      }
      collatedPatches[patch.system].push({
        number: patch.number,
        name: patch.name,
      });
    }
    return { collatedPatches: collatedPatches, systemVersions: systemVersions };
  }

  //创建表格内容时提取的重复逻辑
  function createTableFragment(
    elementName,
    parent,
    firstDivContent,
    secondDivContent,
    downloadName
  ) {
    var suffix = "/api/webservice/system/agentdownload/patch/download?filename=";
    var element = document.createElement(elementName);
    parent.appendChild(element);
    if (elementName === "th") {
      element.setAttribute("colspan", 2);
    }

    var elementStyle =
      elementName === "td" ? "second_col" : elementName === "div" ? "specialSecondColDiv" : "";
    element.className = elementStyle;

    var firstDiv = document.createElement("div");
    element.appendChild(firstDiv);
    firstDiv.className = elementName !== "th" ? "second_col_first_div" : "thead_1";
    firstDiv.textContent = firstDivContent;

    var secondDiv = document.createElement("div");
    element.appendChild(secondDiv);
    secondDiv.className = elementName !== "th" ? "second_col_second_div" : "thead_2";
    secondDiv.textContent = secondDivContent;
    if (elementName !== "th") {
      secondDiv.addEventListener("click", function () {
        download(suffix + downloadName);
      });
    }
  }

  function isSpecialPatch(patches) {
    for (var i = 0; i < patches.length; i++) {
      if (patches[i]["number"] === "KB2919355") {
        return true;
      }
    }
    return false;
  }

  function createPatchDownloadTableCaption(parent, language, localeData) {
    var system_patch_download_title_div = document.createElement("div");
    parent.appendChild(system_patch_download_title_div);
    system_patch_download_title_div.className = "system_patch_download_title";
    system_patch_download_title_div.textContent =
      localeData["system_patch_download_button_content"][language];
  }

  function createTableHead(parent, language, localeData) {
    var table_head = document.createElement("thead");
    parent.appendChild(table_head);

    var tr = document.createElement("tr");
    table_head.appendChild(tr);

    createTableFragment(
      "th",
      tr,
      localeData["system_version"][language],
      localeData["patch_number"][language],
      null
    );

    var marginLeft = language === "en_US" ? (isIE ? "503px" : "485px") : "536px";

    document.querySelector(".thead_2").style.marginLeft = marginLeft;
  }

  function createPatchDownloadTableOutline(parent, language, localeData) {
    createPatchDownloadTableCaption(parent, language, localeData);
    var table = document.createElement("table");
    parent.appendChild(table);
    table.className = "patch_download_table";
    createTableHead(table, language, localeData);
    var tbody = document.createElement("tbody");
    table.appendChild(tbody);

    return tbody;
  }

  function createRegularTableRows(
    parent,
    firstColContent,
    patchesForTableRow,
    language,
    localeData
  ) {
    var tableRow = document.createElement("tr");
    parent.appendChild(tableRow);

    var tableData1 = document.createElement("td");
    tableRow.appendChild(tableData1);
    tableData1.setAttribute("rowspan", patchesForTableRow.length);
    tableData1.className = "first_col";
    tableData1.textContent = firstColContent;

    createTableFragment(
      "td",
      tableRow,
      patchesForTableRow[0]["number"],
      localeData["down_load"][language],
      patchesForTableRow[0]["name"]
    );

    for (var i = 1; i < patchesForTableRow.length; i++) {
      var tableRow2 = document.createElement("tr");
      parent.appendChild(tableRow2);

      createTableFragment(
        "td",
        tableRow2,
        patchesForTableRow[i]["number"],
        localeData["down_load"][language],
        patchesForTableRow[i]["name"]
      );
    }
  }

  function createSpecialTableData(
    parent,
    language,
    localeData,
    patchesForTableRow,
    exe,
    firstColContent
  ) {
    var tableData2 = document.createElement("td");
    parent.appendChild(tableData2);
    tableData2.className = "second_col special_col";

    var specialSecondColDiv1 = document.createElement("div");
    tableData2.appendChild(specialSecondColDiv1);
    specialSecondColDiv1.className = "specialSecondColDiv";
    specialSecondColDiv1.textContent = localeData["message_one"][language];

    //获得下载名称
    var KB2919442DownloadName = "";
    var KB2919355DownloadName = "";
    for (var i = 0; i < patchesForTableRow.length; i++) {
      if (patchesForTableRow[i]["number"] === "KB2919442") {
        KB2919442DownloadName = patchesForTableRow[i]["name"];
      }
      if (patchesForTableRow[i]["number"] === "KB2919355") {
        KB2919355DownloadName = patchesForTableRow[i]["name"];
      }
    }

    createTableFragment(
      "div",
      tableData2,
      "1.KB2919442",
      localeData["down_load"][language],
      KB2919442DownloadName
    );

    var ExeDownloadName =
      firstColContent.substr(firstColContent.length - 3) === "x64" ? exe[0] : exe[1];

    createTableFragment(
      "div",
      tableData2,
      "2.clearcompressionflag.exe" + localeData["message_two"][language],
      localeData["down_load"][language],
      ExeDownloadName
    );

    createTableFragment(
      "div",
      tableData2,
      "3.KB2919355",
      localeData["down_load"][language],
      KB2919355DownloadName
    );
  }

  function createSpecialTableRows(
    parent,
    firstColContent,
    patchesForTableRow,
    language,
    localeData,
    exe
  ) {
    var tableRow = document.createElement("tr");
    parent.appendChild(tableRow);

    var tableData1 = document.createElement("td");
    tableRow.appendChild(tableData1);
    tableData1.className = "first_col special_col";
    tableData1.textContent = firstColContent;
    tableData1.setAttribute("rowspan", patchesForTableRow.length - 1);

    // 特殊单元格
    createSpecialTableData(
      tableRow,
      language,
      localeData,
      patchesForTableRow,
      exe,
      firstColContent
    );

    // 创建一般单元格
    for (var i = 0; i < patchesForTableRow.length; i++) {
      if (
        patchesForTableRow[i]["number"] === "KB2919442" ||
        patchesForTableRow[i]["number"] === "KB2919355"
      ) {
        continue;
      }
      var tableRow2 = document.createElement("tr");
      parent.appendChild(tableRow2);

      createTableFragment(
        "td",
        tableRow2,
        patchesForTableRow[i]["number"],
        localeData["down_load"][language],
        patchesForTableRow[i]["name"]
      );
    }
  }

  function requestDataSuccess() {
    document
      .getElementById("system_patch_download_button_content")
      .addEventListener("click", function () {
        window.scrollTo(0, system_patch_download.offsetTop);
      });
    document.getElementById("overlay").style.display = "none";
    document.getElementById("main").style.visibility = "visible";
  }

  function setSystemVersion(systemVersions) {
    var system_patch_download_tip_content = document.getElementById(
      "system_patch_download_tip_content"
    );
    for (var i = 0; i < systemVersions.length; i++) {
      var versionDiv = document.createElement("div");
      versionDiv.className = "system-item";
      versionDiv.textContent = systemVersions[i];
      system_patch_download_tip_content.appendChild(versionDiv);
    }
  }

  return {
    getQueryVariable: getQueryVariable,
    sendRequest: sendRequest,
    download: download,
    adjustPosition: adjustPosition,
    initPage: initPage,
    setCardData: setCardData,
    collatePatches: collatePatches,
    createPatchDownloadTableOutline: createPatchDownloadTableOutline,
    createRegularTableRows: createRegularTableRows,
    createSpecialTableRows: createSpecialTableRows,
    promptNetworkError: promptNetworkError,
    isSpecialPatch: isSpecialPatch,
    requestDataSuccess: requestDataSuccess,
    setLogoCustomData: setLogoCustomData,
    setSystemVersion: setSystemVersion,
  };
})();
